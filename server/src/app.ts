import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import { errorHandler } from './middleware/errors.js'
import { router } from './routes/index.js'

export const app = express()
app.use(cors({ origin: config.clientOrigin }))
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api', router)
app.use(errorHandler)
