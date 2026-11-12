import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { profileRoutes } from './modules/profile/profile.routes.js'
import { userEventsRoutes } from './modules/user-events/user-events.routes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.webOrigin }))
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ service: 'user-api', status: 'ok' })
  })

  app.use(profileRoutes)
  app.use(userEventsRoutes)
  app.use(errorHandler)
  return app
}
