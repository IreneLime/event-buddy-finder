import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { eventRoutes } from './modules/events/event.routes.js'

export function createEventsApp() {
  const app = express()
  app.use(cors({ origin: env.webOrigin }))
  app.use(express.json())
  app.get('/health', (_request, response) => response.json({ service: 'events-api', status: 'ok' }))
  app.use(eventRoutes)
  app.use(errorHandler)
  return app
}
