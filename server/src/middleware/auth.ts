import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { HttpError } from './errors.js'

export type Role = 'admin' | 'mesero' | 'cocina' | 'cajero'
export type UserClaims = { id: number; username: string; name: string; role: Role }
declare global { namespace Express { interface Request { user?: UserClaims } } }
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('missing')
    req.user = jwt.verify(token, config.jwtSecret) as UserClaims
    next()
  } catch { next(new HttpError(401, 'Autenticación requerida')) }
}
export function allow(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Permisos insuficientes'))
    next()
  }
}
