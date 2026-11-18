import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createAuthRouter } from './routes/auth.js'
import type { TokenVerifier } from './services/token-verifier.js'

interface AppDependencies {
  verifyIdToken?: TokenVerifier
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express()

  app.use(cors({ origin: env.webOrigin }))
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ service: 'auth-api', status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter(dependencies.verifyIdToken))

  app.use(errorHandler)

  return app
}
