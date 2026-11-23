import { api } from './client'

export type OrderStatus = 'Pendiente' | 'En preparación' | 'Listo' | 'Entregado' | 'Pagado' | 'Cancelado'
export type OrderRecord = {
  id: number; tipoPedido: 'Para llevar' | 'Mesa'; numeroMesa: number | null; status: OrderStatus;
  waiter: string; createdAt: string; subtotal: number; total: number; note: string | null;
  items: { productId: number; name: string; qty: number; price: number; note?: string | null }[]
}

type ApiOrder = {
  id: number; tipoPedido: 'Para llevar' | 'Mesa'; numeroMesa: number | null; estado: OrderStatus;
  mesero: string; createdAt: string; subtotal: number; total: number; observaciones: string | null;
  items: { productId: number; productName: string; quantity: number; unitPrice: number; note: string | null }[]
}

function normalize(order: ApiOrder): OrderRecord {
  return {
    id: order.id, tipoPedido: order.tipoPedido, numeroMesa: order.numeroMesa, status: order.estado,
    waiter: order.mesero, createdAt: new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    subtotal: Number(order.subtotal), total: Number(order.total), note: order.observaciones,
    items: order.items.map(item => ({ productId: item.productId, name: item.productName, qty: item.quantity, price: Number(item.unitPrice), note: item.note })),
  }
}

export async function getOrders() {
  const orders = await api<ApiOrder[]>('/orders')
  return orders.map(normalize)
}
export async function getOrder(id: number) { return normalize(await api<ApiOrder>(`/orders/${id}`)) }
export async function createOrder(order: { tipoPedido: 'Para llevar' | 'Mesa'; numeroMesa?: number; observaciones?: string; items: { productId: number; quantity: number; note?: string }[] }) {
  return api<{ id: number; estado: OrderStatus }>('/orders', { method: 'POST', body: JSON.stringify(order) })
}
export const updateOrderStatus = (id: number, estado: OrderStatus) => api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ estado }) })
export const payOrder = (id: number, payment: { metodoPago: 'Efectivo' | 'Tarjeta' | 'Transferencia'; montoRecibido?: number }) => api(`/orders/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) })
