import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { endSession, loginRequest, restoreSession, type SessionUser } from '../api/auth.api'

export type Role = 'admin' | 'mesero' | 'cocina'
type AuthUser = SessionUser
type AuthContextValue = {
  user: AuthUser | null
  login: (role: Role, username: string, password: string) => Promise<void>
  logout: () => void
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(restoreSession)
  const value = useMemo(() => ({
    user,
    login: async (role: Role, username: string, password: string) => {
      setUser(await loginRequest(username, password, role))
    },
    logout: () => { endSession(); setUser(null) },
  }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
