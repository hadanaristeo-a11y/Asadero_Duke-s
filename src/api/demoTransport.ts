import { initialOrders, initialUsers, products } from '../data/demo'
import type { CashCutRecord } from './cashCuts.api'
import type { OrderRecord } from './order.api'
import type { ProductRecord, CategoryRecord } from './productos.api'
import type { UserRecord } from './users.api'

const categoryNames = [...new Set(products.map(product => product.category))]
const categories: CategoryRecord[] = categoryNames.map((name, index) => ({ id: index + 1, name, description: null, active: true }))
const demoProducts: ProductRecord[] = products.map(product => ({
  id: product.id,
  name: product.name,
  description: null,
  imageUrl: product.image,
  price: product.price,
  categoryId: categories.find(category => category.name === product.category)?.id ?? 1,
  category: product.category,
  active: product.active,
}))
const demoUsers: UserRecord[] = initialUsers.map(user => ({
  id: user.id,
  name: user.name,
  username: user.username,
  role: user.role === 'Administrador' ? 'admin' : user.role.toLowerCase() as UserRecord['role'],
  active: user.status === 'Activo',
}))
const demoOrders: OrderRecord[] = [
  ...initialOrders.map(order => {
    const subtotal = order.items.reduce((sum, item) => sum + item.qty * item.price, 0)
    const tableNumber = Number(order.table)
    return {
      id: order.id,
      tipoPedido: Number.isFinite(tableNumber) ? 'Mesa' as const : 'Para llevar' as const,
      numeroMesa: Number.isFinite(tableNumber) ? tableNumber : null,
      status: order.status,
      waiter: order.waiter,
      createdAt: new Date().toISOString(),
      subtotal,
      total: subtotal,
      note: order.note ?? null,
      items: order.items.map(item => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price, note: item.note })),
    }
  }),
  {
    id: 1029, tipoPedido: 'Para llevar', numeroMesa: null, status: 'Pagado',
    waiter: 'Carlos Ramírez', createdAt: new Date().toISOString(), subtotal: 205, total: 205,
    note: null, items: [{ productId: 2, name: 'Hamburguesa especial', qty: 1, price: 150 }, { productId: 7, name: 'Refresco', qty: 1, price: 35 }, { productId: 8, name: 'Agua natural', qty: 1, price: 20 }],
  },
]

let demoCut: CashCutRecord | null = null
let nextId = 2000

function readBody(init: RequestInit) {
  if (typeof init.body !== 'string') return {}
  try { return JSON.parse(init.body) as Record<string, unknown> } catch { return {} }
}

export async function demoApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const body = readBody(init)

  if (path === '/products' && method === 'GET') return demoProducts as T
  if (path === '/categories' && method === 'GET') return categories as T
  if (path === '/users' && method === 'GET') return demoUsers as T
  if (path === '/orders' && method === 'GET') return demoOrders as T
  if (path === '/cash-cuts/current' && method === 'GET') return { cut: demoCut } as T

  if (path === '/categories' && method === 'POST') {
    const category = { id: nextId++, name: String(body.name ?? 'Nueva categoría'), description: null, active: true }
    categories.push(category)
    return category as T
  }
  const categoryMatch = path.match(/^\/categories\/(\d+)$/)
  if (categoryMatch && method === 'PATCH') {
    const category = categories.find(item => item.id === Number(categoryMatch[1]))
    if (category) category.active = Boolean(body.active)
    return category as T
  }

  if (path === '/products' && method === 'POST') {
    const category = categories.find(item => item.id === Number(body.categoryId)) ?? categories[0]
    const product: ProductRecord = {
      id: nextId++, name: String(body.name ?? 'Producto'), description: String(body.description ?? ''),
      imageUrl: String(body.imageUrl ?? ''), price: Number(body.price ?? 0), categoryId: category.id,
      category: category.name, active: true,
    }
    demoProducts.push(product)
    return product as T
  }
  const productMatch = path.match(/^\/products\/(\d+)$/)
  if (productMatch && method === 'PUT') {
    const product = demoProducts.find(item => item.id === Number(productMatch[1]))
    if (product) Object.assign(product, body)
    return product as T
  }

  if (path === '/users' && method === 'POST') {
    const user: UserRecord = {
      id: nextId++, name: String(body.name ?? 'Usuario'), username: String(body.username ?? 'usuario'),
      role: String(body.role ?? 'mesero') as UserRecord['role'], active: true,
    }
    demoUsers.push(user)
    return user as T
  }
  const userMatch = path.match(/^\/users\/(\d+)\/state$/)
  if (userMatch && method === 'PATCH') {
    const user = demoUsers.find(item => item.id === Number(userMatch[1]))
    if (user) user.active = Boolean(body.active)
    return { id: Number(userMatch[1]), active: Boolean(body.active) } as T
  }

  if (path === '/cash-cuts' && method === 'POST') {
    const fondoInicial = Number(body.fondoInicial ?? 0)
    demoCut = {
      id: nextId++, openedAt: new Date().toISOString(), fondoInicial,
      totalEfectivo: 0, totalTarjeta: 0, totalTransferencia: 0, totalVentas: 0,
      efectivoEsperado: fondoInicial, efectivoContado: null, diferencia: null,
    }
    return { cut: demoCut } as T
  }
  const closeMatch = path.match(/^\/cash-cuts\/(\d+)\/close$/)
  if (closeMatch && method === 'PATCH' && demoCut?.id === Number(closeMatch[1])) {
    demoCut.efectivoContado = Number(body.efectivoContado ?? 0)
    demoCut.diferencia = demoCut.efectivoContado - demoCut.efectivoEsperado
    const closed = demoCut
    demoCut = null
    return { cut: closed } as T
  }

  return {} as T
}
