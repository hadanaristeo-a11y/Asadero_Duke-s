import { z } from 'zod'
import type { Request, Response } from 'express'
import { pool } from '../../database/pool.js'
import { HttpError } from '../../middleware/errors.js'

const orderSchema = z.object({
  tipoPedido: z.enum(['Para llevar', 'Mesa']).default('Para llevar'),
  numeroMesa: z.number().int().positive().optional().nullable(),
  observaciones: z.string().max(300).optional().nullable(),
  items: z.array(z.object({
    productId: z.number().int().positive(), quantity: z.number().int().positive().max(100),
    note: z.string().max(200).optional().nullable(),
  })).min(1),
}).superRefine((value, ctx) => {
  if (value.tipoPedido === 'Mesa' && !value.numeroMesa) ctx.addIssue({ code: 'custom', path: ['numeroMesa'], message: 'Indica el número de mesa' })
  if (value.tipoPedido === 'Para llevar' && value.numeroMesa != null) ctx.addIssue({ code: 'custom', path: ['numeroMesa'], message: 'Un pedido para llevar no lleva número de mesa' })
})
const statusSchema = z.object({ estado: z.enum(['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado']) })
const paymentSchema = z.object({
  metodoPago: z.enum(['Efectivo', 'Tarjeta', 'Transferencia']), montoRecibido: z.number().nonnegative().optional(),
  referencia: z.string().max(100).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.metodoPago === 'Efectivo' && value.montoRecibido === undefined) ctx.addIssue({ code: 'custom', path: ['montoRecibido'], message: 'Indica el efectivo recibido' })
  if (value.metodoPago !== 'Efectivo' && value.montoRecibido !== undefined) ctx.addIssue({ code: 'custom', path: ['montoRecibido'], message: 'El efectivo recibido solo aplica al pago en efectivo' })
})
const idSchema = z.coerce.number().int().positive()
const transitions: Record<string, string[]> = { Pendiente: ['En preparación'], 'En preparación': ['Listo'], Listo: ['Entregado'] }
const orderSelect = `
  SELECT p.id_pedido AS id, p.tipo_pedido AS "tipoPedido", p.numero_mesa AS "numeroMesa",
    p.estado, p.observaciones, p.subtotal, p.total, p.fecha_hora_creacion AS "createdAt",
    u.nombre_completo AS mesero,
    COALESCE((SELECT json_agg(json_build_object(
      'productId', d.id_producto, 'productName', d.nombre_producto, 'quantity', d.cantidad,
      'unitPrice', d.precio_unitario, 'note', d.nota) ORDER BY d.id_detalle)
      FROM detalle_pedido d WHERE d.id_pedido=p.id_pedido), '[]'::json) AS items
  FROM pedidos p JOIN usuarios u ON u.id_usuario=p.id_mesero`

export async function listOrders(req: Request, res: Response) {
  const result = req.user?.role === 'mesero'
    ? await pool.query(`${orderSelect} WHERE p.id_mesero=$1 ORDER BY p.fecha_hora_creacion DESC`, [req.user.id])
    : await pool.query(`${orderSelect} ORDER BY p.fecha_hora_creacion DESC`)
  res.json(result.rows)
}

export async function getOrder(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const params: number[] = [id]
  const waiterFilter = req.user?.role === 'mesero' ? `AND p.id_mesero=$${params.push(req.user.id)}` : ''
  const result = await pool.query(`${orderSelect} WHERE p.id_pedido=$1 ${waiterFilter}`, params)
  if (!result.rows[0]) throw new HttpError(404, 'Pedido no encontrado')
  res.json(result.rows[0])
}

export async function createOrder(req: Request, res: Response) {
  const value = orderSchema.parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const productIds = [...new Set(value.items.map(item => item.productId))]
    const found = await client.query<{ id: number; name: string; price: string }>(
      'SELECT id_producto AS id, nombre AS name, precio AS price FROM productos WHERE activo=true AND id_producto=ANY($1::int[])',
      [productIds],
    )
    if (found.rows.length !== productIds.length) throw new HttpError(400, 'Uno o más productos no existen o están inactivos')
    const subtotal = value.items.reduce((sum, item) => sum + Number(found.rows.find(p => p.id === item.productId)!.price) * item.quantity, 0)
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO pedidos(id_mesero,tipo_pedido,numero_mesa,observaciones,subtotal,total)
       VALUES($1,$2,$3,$4,$5,$5) RETURNING id_pedido AS id`,
      [req.user!.id, value.tipoPedido, value.numeroMesa ?? null, value.observaciones ?? null, subtotal],
    )
    const orderId = inserted.rows[0].id
    for (const item of value.items) {
      const product = found.rows.find(p => p.id === item.productId)!
      const price = Number(product.price)
      await client.query(
        `INSERT INTO detalle_pedido(id_pedido,id_producto,nombre_producto,cantidad,precio_unitario,nota,subtotal_detalle)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [orderId, item.productId, product.name, item.quantity, price, item.note ?? null, price * item.quantity],
      )
    }
    await client.query('INSERT INTO historial_estados_pedido(id_pedido,estado,id_usuario) VALUES($1,$2,$3)', [orderId, 'Pendiente', req.user!.id])
    await client.query('COMMIT')
    res.status(201).json({ id: orderId, estado: 'Pendiente', tipoPedido: value.tipoPedido, numeroMesa: value.numeroMesa ?? null, subtotal, total: subtotal, items: value.items })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function updateOrderStatus(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const { estado } = statusSchema.parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query<{ estado: string; id_mesero: number }>('SELECT estado,id_mesero FROM pedidos WHERE id_pedido=$1 FOR UPDATE', [id])
    const order = found.rows[0]
    if (!order) throw new HttpError(404, 'Pedido no encontrado')
    if (req.user?.role === 'mesero' && order.id_mesero !== req.user.id) throw new HttpError(403, 'No puedes modificar este pedido')
    const permitted = (transitions[order.estado] ?? []).includes(estado) || (req.user?.role === 'admin' && estado === 'Cancelado')
    if (!permitted) throw new HttpError(400, 'Transición de estado no permitida')
    await client.query('UPDATE pedidos SET estado=$2 WHERE id_pedido=$1', [id, estado])
    await client.query('INSERT INTO historial_estados_pedido(id_pedido,estado,id_usuario) VALUES($1,$2,$3)', [id, estado, req.user!.id])
    await client.query('COMMIT')
    res.json({ id, estado })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function payOrder(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const value = paymentSchema.parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query<{ estado: string; total: string; id_mesero: number }>(
      'SELECT estado,total,id_mesero FROM pedidos WHERE id_pedido=$1 FOR UPDATE', [id],
    )
    const order = found.rows[0]
    if (!order) throw new HttpError(404, 'Pedido no encontrado')
    if (req.user?.role === 'mesero' && order.id_mesero !== req.user.id) throw new HttpError(403, 'No puedes cobrar este pedido')
    if (order.estado !== 'Entregado') throw new HttpError(409, 'El pedido debe estar entregado antes de cobrarlo')
    const total = Number(order.total)
    const received = value.metodoPago === 'Efectivo' ? value.montoRecibido! : total
    if (received < total) throw new HttpError(400, 'El monto recibido es menor al total')
    const change = value.metodoPago === 'Efectivo' ? received - total : null
    await client.query(
      `INSERT INTO pagos(id_pedido,id_usuario_cajero,metodo_pago,monto_total,monto_recibido,cambio,referencia)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user!.id, value.metodoPago, total, value.metodoPago === 'Efectivo' ? received : null, change, value.referencia ?? null],
    )
    await client.query("UPDATE pedidos SET estado='Pagado' WHERE id_pedido=$1", [id])
    await client.query("INSERT INTO historial_estados_pedido(id_pedido,estado,id_usuario) VALUES($1,'Pagado',$2)", [id, req.user!.id])
    await client.query('COMMIT')
    res.status(201).json({ orderId: id, estado: 'Pagado', metodoPago: value.metodoPago, total, montoRecibido: value.metodoPago === 'Efectivo' ? received : null, cambio: change })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}
