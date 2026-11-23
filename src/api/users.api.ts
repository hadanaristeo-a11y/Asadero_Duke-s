import { api } from './client'
import type { Role } from '../context/AuthContext'

export type UserRecord = { id: number; name: string; username: string; role: Role | 'cajero'; active: boolean; createdAt?: string }
export const getUsers = () => api<UserRecord[]>('/users')
export const createUser = (user: { name: string; username: string; password: string; role: Role }) => api<UserRecord>('/users', { method: 'POST', body: JSON.stringify(user) })
export const updateUserState = (id: number, active: boolean) => api<{ id: number; active: boolean }>(`/users/${id}/state`, { method: 'PATCH', body: JSON.stringify({ active }) })
