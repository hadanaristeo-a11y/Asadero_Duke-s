const baseURL = 'http://localhost:3000/api'

async function request<T>(method: string, path: string, data?: unknown): Promise<{ data: T; status: number }> {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  const body = await response.json().catch(() => null) as T | null
  if (!response.ok) throw new Error(`API error (${response.status})`)
  return { data: body as T, status: response.status }
}

const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, data?: unknown) => request<T>('POST', path, data),
  put: <T = unknown>(path: string, data?: unknown) => request<T>('PUT', path, data),
  patch: <T = unknown>(path: string, data?: unknown) => request<T>('PATCH', path, data),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

export default api
