import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Request, Response } from 'express'
import { pool } from '../../database/pool.js'
import { HttpError } from '../../middleware/errors.js'

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(255).nullable().optional(),
  imageUrl: z.string().max(300).nullable().optional(),
  price: z.number().min(0),
  categoryId: z.number().int().positive(),
  active: z.boolean().default(true),
})
const categorySchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().max(255).nullable().optional() })
const activeSchema = z.object({ active: z.boolean() })
const userSchema = z.object({
  username: z.string().trim().min(3).max(50),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'mesero', 'cocina', 'cajero']),
  active: z.boolean().default(true),
})
const idSchema = z.coerce.number().int().positive()
const dbRole = { admin: 'Administrador', mesero: 'Mesero', cocina: 'Cocina', cajero: 'Cajero' } as const

export async function products(_req: Request, res: Response) {
  const result = await pool.query(`
    SELECT p.id_producto AS id, p.nombre AS name, p.descripcion AS description,
      p.imagen_url AS "imageUrl", p.precio AS price, p.id_categoria AS "categoryId",
      c.nombre AS category, p.activo AS active
    FROM productos p JOIN categorias c ON c.id_categoria = p.id_categoria
    ORDER BY p.nombre`)
  res.json(result.rows)
}

export async function createProduct(req: Request, res: Response) {
  const v = productSchema.parse(req.body)
  const result = await pool.query(
    `INSERT INTO productos(nombre, descripcion, imagen_url, precio, id_categoria, activo)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_producto AS id`,
    [v.name, v.description ?? null, v.imageUrl ?? null, v.price, v.categoryId, v.active],
  )
  res.status(201).json({ id: result.rows[0].id, ...v })
}

export async function updateProduct(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const v = productSchema.parse(req.body)
  const result = await pool.query(
    `UPDATE productos SET nombre=$2, descripcion=$3, imagen_url=$4, precio=$5,
      id_categoria=$6, activo=$7 WHERE id_producto=$1 RETURNING id_producto`,
    [id, v.name, v.description ?? null, v.imageUrl ?? null, v.price, v.categoryId, v.active],
  )
  if (!result.rowCount) throw new HttpError(404, 'Producto no encontrado')
  res.json({ id, ...v })
}

export async function categories(_req: Request, res: Response) {
  const result = await pool.query(`
    SELECT id_categoria AS id, nombre AS name, descripcion AS description,
      (estado = 'Activo') AS active FROM categorias ORDER BY nombre`)
  res.json(result.rows)
}

export async function createCategory(req: Request, res: Response) {
  const v = categorySchema.parse(req.body)
  const result = await pool.query(
    `INSERT INTO categorias(nombre, descripcion) VALUES ($1,$2) RETURNING id_categoria AS id`,
    [v.name, v.description ?? null],
  )
  res.status(201).json({ id: result.rows[0].id, ...v, active: true })
}

export async function updateCategory(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const { active } = activeSchema.parse(req.body)
  const result = await pool.query(
    `UPDATE categorias SET estado=$2 WHERE id_categoria=$1 RETURNING id_categoria`,
    [id, active ? 'Activo' : 'Inactivo'],
  )
  if (!result.rowCount) throw new HttpError(404, 'Categoría no encontrada')
  res.json({ id, active })
}

export async function users(_req: Request, res: Response) {
  const result = await pool.query(`
    SELECT id_usuario AS id, nombre_usuario AS username, nombre_completo AS name,
      CASE rol WHEN 'Administrador' THEN 'admin' ELSE LOWER(rol) END AS role,
      (estado = 'Activo') AS active, fecha_creacion AS "createdAt"
    FROM usuarios ORDER BY nombre_completo`)
  res.json(result.rows)
}

export async function createUser(req: Request, res: Response) {
  const v = userSchema.parse(req.body)
  const hash = await bcrypt.hash(v.password, 12)
  const result = await pool.query(
    `INSERT INTO usuarios(nombre_usuario, nombre_completo, password_hash, rol, estado)
     VALUES ($1,$2,$3,$4,$5) RETURNING id_usuario AS id`,
    [v.username, v.name, hash, dbRole[v.role], v.active ? 'Activo' : 'Inactivo'],
  )
  res.status(201).json({ id: result.rows[0].id, username: v.username, name: v.name, role: v.role, active: v.active })
}

export async function updateUserState(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id)
  const { active } = activeSchema.parse(req.body)
  const result = await pool.query(
    `UPDATE usuarios SET estado=$2 WHERE id_usuario=$1 RETURNING id_usuario`,
    [id, active ? 'Activo' : 'Inactivo'],
  )
  if (!result.rowCount) throw new HttpError(404, 'Usuario no encontrado')
  res.json({ id, active })
}
