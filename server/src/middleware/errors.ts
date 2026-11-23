import type { NextFunction, Request, Response } from 'express'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next) }
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message })
  if (error instanceof Error && error.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos' })
  console.error(error)
  return res.status(500).json({ error: 'Error interno del servidor' })
}
