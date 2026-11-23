# Backend

API Express + TypeScript conectada a PostgreSQL. El frontend consume `http://localhost:3001/api` (puedes cambiarlo con `VITE_API_URL`). Las rutas del administrador consultan PostgreSQL para productos, categorÃ­as, usuarios y pedidos; los reportes y el corte se calculan con los pedidos de la API.

## ConfiguraciÃ³n

1. Crea una base PostgreSQL vacia con nombre `DUK'S-BD`.
2. Copia `server/.env.example` a `server/.env` y configura `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` y `PGPASSWORD`. Cambia tambiÃ©n `JWT_SECRET` por una cadena aleatoria de al menos 32 caracteres.
3. Si la base esta vacia, crea las tablas con `psql -d "DUK'S-BD" -f server/database/migrations/001_initial_schema.sql`. Si ya tiene las tablas, no ejecutes esa migracion inicial.
4. Instala dependencias desde la raÃ­z con `npm install`.
5. Verifica la conexiÃ³n con `npm run backend:check-db`.
6. Configura `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` en `server/.env`; ejecuta `npm run backend:seed-admin` una vez y retira la contraseÃ±a temporal.
7. Inicia la API con `npm run backend:dev` y el frontend con `npm run dev` en terminales separadas.

El comando para crear el administrador tambiÃ©n acepta `npm run backend:seed_admin` (guion bajo) como alias.

## Estructura de la API

- `server/src/config`: validaciÃ³n de configuraciÃ³n y variables de entorno.
- `server/src/database`: pool y conexiÃ³n con PostgreSQL.
- `server/src/modules`: rutas y lÃ³gica agrupadas por autenticaciÃ³n, catÃ¡logo y pedidos.
- `server/src/middleware`: autenticaciÃ³n, permisos y respuestas de error.
- `server/src/routes`: composiciÃ³n de rutas bajo `/api`.
- `server/src/scripts`: tareas de mantenimiento como crear el administrador inicial.
- `server/database/migrations`: migraciones versionadas del esquema PostgreSQL.

El servidor valida la conexiÃ³n PostgreSQL al iniciar. `GET /health` responde a comprobaciones del proceso; un error de conexiÃ³n con la base impide iniciar la API.

## Rutas

Todas las rutas salvo `POST /api/auth/login` requieren `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`.
- Productos: `GET /api/products`; admin: `POST`, `PUT /api/products/:id`.
- CategorÃ­as: `GET /api/categories`; admin: `POST`, `PATCH /api/categories/:id`.
- Usuarios: admin `GET`, `POST /api/users`, `PATCH /api/users/:id/state`.
- Corte de caja: admin `GET /api/cash-cuts/current`, `POST /api/cash-cuts`, `PATCH /api/cash-cuts/:id/close`.
- Pedidos: `GET /api/orders`, `GET /api/orders/:id`; admin/mesero `POST /api/orders`.
- Cocina/admin actualizan estados con `PATCH /api/orders/:id/status`.
- Cajero/admin/mesero registran pagos con `POST /api/orders/:id/payments`.
