import { Pool } from 'pg'
import { config } from '../config/env.js'

export const pool = new Pool(config.postgres)

pool.on('error', error => {
  console.error('Error inesperado en el pool de PostgreSQL:', error)
})
