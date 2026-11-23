import { api, clearToken, isDemoMode, setToken } from './client'
import type { Role } from '../context/AuthContext'

export type SessionUser = { id: number; username: string; name: string; role: Role }
type LoginResponse = { user: SessionUser; token: string }

export async function loginRequest(username: string, password: string, expectedRole: Role) {
  if (isDemoMode) {
    const user: SessionUser = { id: 1, username: username.trim(), name: 'Administrador de vista previa', role: expectedRole }
    setToken('local-demo-session')
    sessionStorage.setItem('dukes-user', JSON.stringify(user))
    return user
  }

  const result = await api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (result.user.role !== expectedRole) {
    throw new Error('La cuenta no tiene el rol seleccionado.')
  }
  setToken(result.token)
  sessionStorage.setItem('dukes-user', JSON.stringify(result.user))
  return result.user
}

export function restoreSession(): SessionUser | null {
  try {
    const token = sessionStorage.getItem('dukes-access-token')
    const user = sessionStorage.getItem('dukes-user')
    return token && user ? JSON.parse(user) as SessionUser : null
  } catch { return null }
}

export function endSession() {
  clearToken()
  sessionStorage.removeItem('dukes-user')
}
