let closePool: (() => Promise<void>) | undefined
try {
  const { pool } = await import('../database/pool.js')
  closePool = () => pool.end()
  const result = await pool.query<{ database: string; user: string }>(
    'SELECT current_database() AS database, current_user AS user',
  )
  console.log(`Conexión PostgreSQL correcta: base ${result.rows[0].database}, usuario ${result.rows[0].user}.`)
  const expectedTables = ['usuarios', 'categorias', 'productos', 'pedidos', 'detalle_pedido', 'pagos', 'cortes_caja', 'historial_estados_pedido']
  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name=ANY($1::text[])`,
    [expectedTables],
  )
  const existingTables = new Set(tables.rows.map(row => row.table_name))
  const missingTables = expectedTables.filter(table => !existingTables.has(table))
  if (missingTables.length) {
    console.error(`Faltan tablas requeridas: ${missingTables.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log('Esquema verificado: están presentes las tablas del sistema.')
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido'
  console.error(`No se pudo conectar con PostgreSQL: ${message}`)
  process.exitCode = 1
} finally {
  await closePool?.()
}
