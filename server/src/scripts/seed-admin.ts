import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../database/pool.js'

const seed = z.object({
  BOOTSTRAP_ADMIN_USERNAME: z.string().trim().min(3).max(50),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1).max(100).default('Administrador'),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(4).max(128),
}).parse(process.env)

try {
  const exists = await pool.query('SELECT id_usuario FROM usuarios WHERE nombre_usuario=$1', [seed.BOOTSTRAP_ADMIN_USERNAME])
  if (exists.rowCount) throw new Error('Ese nombre de usuario ya existe; no se modificó.')
  const hash = await bcrypt.hash(seed.BOOTSTRAP_ADMIN_PASSWORD, 12)
  await pool.query(
    `INSERT INTO usuarios(nombre_usuario,nombre_completo,password_hash,rol)
     VALUES($1,$2,$3,'Administrador')`,
    [seed.BOOTSTRAP_ADMIN_USERNAME, seed.BOOTSTRAP_ADMIN_NAME, hash],
  )
  console.log('Administrador inicial creado. Retira las variables BOOTSTRAP_ADMIN_* del entorno.')
} finally { await pool.end() }
