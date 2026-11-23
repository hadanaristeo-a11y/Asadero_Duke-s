import { z } from 'zod'
import type { Request, Response } from 'express'
import { pool } from '../../database/pool.js'
import { HttpError } from '../../middleware/errors.js'

const openSchema = z.object({ fondoInicial: z.number().finite().nonnegative() })
const closeSchema = z.object({ efectivoContado: z.number().finite().nonnegative() })
const idSchema = z.coerce.number().int().positive()

export async function currentCashCut(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT c.id_corte AS id, c.fecha_hora_apertura AS "openedAt", c.fondo_inicial AS "fondoInicial",
      totals.efectivo AS "totalEfectivo", totals.tarjeta AS "totalTarjeta",
      totals.transferencia AS "totalTransferencia", totals.ventas AS "totalVentas",
      c.efectivo_esperado AS "efectivoEsperado", c.efectivo_contado AS "efectivoContado",
      c.diferencia
    FROM cortes_caja c
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(SUM(p.monto_total) FILTER (WHERE p.metodo_pago='Efectivo'), 0) AS efectivo,
        COALESCE(SUM(p.monto_total) FILTER (WHERE p.metodo_pago='Tarjeta'), 0) AS tarjeta,
        COALESCE(SUM(p.monto_total) FILTER (WHERE p.metodo_pago='Transferencia'), 0) AS transferencia,
        COALESCE(SUM(p.monto_total), 0) AS ventas
      FROM pagos p
      WHERE p.fecha_hora_pago >= c.fecha_hora_apertura AND p.fecha_hora_pago <= CURRENT_TIMESTAMP
    ) totals
    WHERE c.id_usuario=$1 AND c.fecha_hora_cierre IS NULL`,
    [req.user!.id],
  )
  res.json({ cut: result.rows[0] ?? null })
}

export async function openCashCut(req: Request, res: Response) {
  const { fondoInicial } = openSchema.parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(64001, $1)', [req.user!.id])
    const exists = await client.query(
      'SELECT id_corte FROM cortes_caja WHERE id_usuario=$1 AND fecha_hora_cierre IS NULL FOR UPDATE',
      [req.user!.id],
    )
    if (exists.rowCount) throw new HttpError(409, 'Ya tienes un corte de caja abierto')
    const created = await client.query(
      `INSERT INTO cortes_caja(id_usuario,fondo_inicial,efectivo_esperado)
       VALUES($1,$2,$2) RETURNING id_corte AS id,fecha_hora_apertura AS "openedAt",fondo_inicial AS "fondoInicial"`,
      [req.user!.id, fondoInicial],
    )
    await client.query('COMMIT')
    res.status(201).json({ cut: { ...created.rows[0], totalEfectivo: 0, totalTarjeta: 0, totalTransferencia: 0, totalVentas: 0, efectivoEsperado: fondoInicial, efectivoContado: null, diferencia: null } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function closeCashCut(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const { efectivoContado } = closeSchema.parse(req.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query<{ fecha_hora_apertura: Date; fondo_inicial: string }>(
      `SELECT fecha_hora_apertura,fondo_inicial FROM cortes_caja
       WHERE id_corte=$1 AND id_usuario=$2 AND fecha_hora_cierre IS NULL FOR UPDATE`,
      [id, req.user!.id],
    )
    const cut = found.rows[0]
    if (!cut) throw new HttpError(404, 'No se encontró un corte abierto')
    const sums = await client.query<{ efectivo: string; tarjeta: string; transferencia: string; ventas: string }>(
      `SELECT
        COALESCE(SUM(monto_total) FILTER (WHERE metodo_pago='Efectivo'),0) AS efectivo,
        COALESCE(SUM(monto_total) FILTER (WHERE metodo_pago='Tarjeta'),0) AS tarjeta,
        COALESCE(SUM(monto_total) FILTER (WHERE metodo_pago='Transferencia'),0) AS transferencia,
        COALESCE(SUM(monto_total),0) AS ventas
       FROM pagos WHERE fecha_hora_pago >= $1 AND fecha_hora_pago <= CURRENT_TIMESTAMP`,
      [cut.fecha_hora_apertura],
    )
    const totals = sums.rows[0]
    const expected = Number(cut.fondo_inicial) + Number(totals.efectivo)
    const difference = efectivoContado - expected
    await client.query(
      `UPDATE cortes_caja SET fecha_hora_cierre=CURRENT_TIMESTAMP,total_efectivo=$2,
        total_tarjeta=$3,total_transferencia=$4,total_ventas=$5,efectivo_esperado=$6,
        efectivo_contado=$7,diferencia=$8 WHERE id_corte=$1`,
      [id, totals.efectivo, totals.tarjeta, totals.transferencia, totals.ventas, expected, efectivoContado, difference],
    )
    await client.query('COMMIT')
    res.json({ cut: {
      id, openedAt: cut.fecha_hora_apertura, fondoInicial: Number(cut.fondo_inicial),
      totalEfectivo: Number(totals.efectivo), totalTarjeta: Number(totals.tarjeta),
      totalTransferencia: Number(totals.transferencia), totalVentas: Number(totals.ventas),
      efectivoEsperado: expected, efectivoContado, diferencia: difference,
    } })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}
