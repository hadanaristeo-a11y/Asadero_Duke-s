import { Router } from 'express'
import { asyncHandler } from '../../middleware/errors.js'
import { allow } from '../../middleware/auth.js'
import * as orders from './orders.controller.js'

export const ordersRouter = Router()
ordersRouter.get('/orders', allow('admin', 'mesero', 'cocina', 'cajero'), asyncHandler(orders.listOrders))
ordersRouter.get('/orders/:id', allow('admin', 'mesero', 'cocina', 'cajero'), asyncHandler(orders.getOrder))
ordersRouter.post('/orders', allow('admin', 'mesero'), asyncHandler(orders.createOrder))
ordersRouter.patch('/orders/:id/status', allow('admin', 'cocina'), asyncHandler(orders.updateOrderStatus))
ordersRouter.post('/orders/:id/payments', allow('admin', 'cajero', 'mesero'), asyncHandler(orders.payOrder))
