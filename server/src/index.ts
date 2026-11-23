import { app } from './app.js'
import { config } from './config/env.js'
import { pool } from './database/pool.js'

try {
  await pool.query('SELECT 1')
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido'
  console.error(`No se pudo conectar con PostgreSQL: ${message}`)
  await pool.end()
  process.exit(1)
}

const server = app.listen(config.port, () => console.log(`API lista en http://localhost:${config.port}`))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => { void pool.end().finally(() => process.exit(0)) }))
}
