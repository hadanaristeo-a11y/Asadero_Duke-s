import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../../config/env.js'
import { pool } from '../../database/pool.js'
import type { Role } from '../../middleware/auth.js'
import { HttpError } from '../../middleware/errors.js'

export async function login(username: string, password: string) {
  const result = await pool.query(
    `SELECT id_usuario AS id, nombre_usuario AS username, nombre_completo AS name,
      CASE rol WHEN 'Administrador' THEN 'admin' ELSE LOWER(rol) END AS role, password_hash
     FROM usuarios WHERE nombre_usuario=$1 AND estado='Activo'`,
    [username],
  )
  const row = result.rows[0] as { id: number; username: string; name: string; role: Role; password_hash: string } | undefined
  if (!row || !await bcrypt.compare(password, row.password_hash)) throw new HttpError(401, 'Usuario o contraseña incorrectos')
  const user = { id: row.id, username: row.username, name: row.name, role: row.role }
  return { user, token: jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }) }
}
