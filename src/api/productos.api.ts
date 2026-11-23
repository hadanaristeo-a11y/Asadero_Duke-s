import { api } from './client'

export type ProductRecord = { id: number; name: string; description: string | null; imageUrl: string | null; price: number; categoryId: number; category: string; active: boolean }
export type CategoryRecord = { id: number; name: string; description: string | null; active: boolean }
export type ProductInput = { name: string; description?: string | null; imageUrl?: string | null; price: number; categoryId: number; active?: boolean }

export const getProducts = () => api<ProductRecord[]>('/products')
export const createProduct = (product: ProductInput) => api<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(product) })
export const updateProduct = (id: number, product: ProductInput) => api<ProductRecord>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) })
export const getCategories = () => api<CategoryRecord[]>('/categories')
export const createCategory = (name: string) => api<CategoryRecord>('/categories', { method: 'POST', body: JSON.stringify({ name }) })
export const updateCategory = (id: number, active: boolean) => api<CategoryRecord>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
