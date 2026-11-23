import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const parsedEnv = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().min(1),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PGSSL: z.enum(['true', 'false']).default('false'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
}).safeParse(process.env)

if (!parsedEnv.success) {
  const invalidKeys = [...new Set(parsedEnv.error.issues.map(issue => String(issue.path[0]))) ]
  throw new Error(`Configuración incompleta en server/.env. Revisa estas variables: ${invalidKeys.join(', ')}`)
}

const env = parsedEnv.data

export const config = {
  port: env.PORT,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  clientOrigin: env.CLIENT_ORIGIN,
  postgres: {
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  },
}
