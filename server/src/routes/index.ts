import { Router } from 'express'
import { asyncHandler } from '../middleware/errors.js'
import { authenticate } from '../middleware/auth.js'
import { signIn } from '../modules/auth/auth.controller.js'
import { catalogRouter } from '../modules/catalog/catalog.routes.js'
import { ordersRouter } from '../modules/orders/orders.routes.js'
import { cashCutsRouter } from '../modules/cash-cuts/cash-cuts.routes.js'

export const router = Router()

router.post('/auth/login', asyncHandler(signIn))
router.use(authenticate)
router.get('/auth/me', (req, res) => res.json({ user: req.user }))
router.use(catalogRouter)
router.use(ordersRouter)
router.use(cashCutsRouter)
