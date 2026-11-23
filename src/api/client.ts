const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')
const TOKEN_KEY = 'dukes-access-token'
export const isDemoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export function getToken() { return sessionStorage.getItem(TOKEN_KEY) }
export function setToken(token: string) { sessionStorage.setItem(TOKEN_KEY, token) }
export function clearToken() { sessionStorage.removeItem(TOKEN_KEY) }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (isDemoMode) {
    const { demoApi } = await import('./demoTransport')
    return demoApi<T>(path, init)
  }

  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que el backend esté iniciado.', 0)
  }
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new ApiError(body.error || 'Ocurrió un error al comunicarse con el servidor.', response.status)
  return body as T
}

export function apiMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}
