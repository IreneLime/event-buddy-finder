import type { ObjectStorage } from '@event-buddy/storage'
import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createImageRouter } from './modules/images/image.routes.js'

export function createApp(storage?: ObjectStorage) {
  const app = express()
  app.use(cors({ origin: env.webOrigin }))
  app.use(express.json())
  app.get('/health', (_request, response) => {
    response.json({ service: 'image-api', status: 'ok' })
  })
  app.use(createImageRouter(storage))
  app.use(errorHandler)
  return app
}
