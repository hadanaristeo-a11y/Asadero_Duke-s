import { z } from 'zod'
import type { Request, Response } from 'express'
import { login } from './auth.service.js'

const schema = z.object({ username: z.string().trim().min(1).max(50), password: z.string().min(1).max(128) })
export async function signIn(req: Request, res: Response) {
  const input = schema.parse(req.body)
  res.json(await login(input.username, input.password))
}
