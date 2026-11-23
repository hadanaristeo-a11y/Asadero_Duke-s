import { Router } from 'express'
import { asyncHandler } from '../../middleware/errors.js'
import { allow } from '../../middleware/auth.js'
import * as cashCuts from './cash-cuts.controller.js'

export const cashCutsRouter = Router()
cashCutsRouter.use(allow('admin'))
cashCutsRouter.get('/cash-cuts/current', asyncHandler(cashCuts.currentCashCut))
cashCutsRouter.post('/cash-cuts', asyncHandler(cashCuts.openCashCut))
cashCutsRouter.patch('/cash-cuts/:id/close', asyncHandler(cashCuts.closeCashCut))
