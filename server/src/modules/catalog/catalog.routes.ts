import { Router } from 'express'
import { asyncHandler } from '../../middleware/errors.js'
import { allow } from '../../middleware/auth.js'
import * as catalog from './catalog.controller.js'

export const catalogRouter = Router()
catalogRouter.get('/products', asyncHandler(catalog.products))
catalogRouter.post('/products', allow('admin'), asyncHandler(catalog.createProduct))
catalogRouter.put('/products/:id', allow('admin'), asyncHandler(catalog.updateProduct))
catalogRouter.get('/categories', asyncHandler(catalog.categories))
catalogRouter.post('/categories', allow('admin'), asyncHandler(catalog.createCategory))
catalogRouter.patch('/categories/:id', allow('admin'), asyncHandler(catalog.updateCategory))
catalogRouter.get('/users', allow('admin'), asyncHandler(catalog.users))
catalogRouter.post('/users', allow('admin'), asyncHandler(catalog.createUser))
catalogRouter.patch('/users/:id/state', allow('admin'), asyncHandler(catalog.updateUserState))
