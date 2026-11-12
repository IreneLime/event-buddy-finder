import { Router } from 'express'
import { createRequireAuth, requireEmailVerified } from '../middleware/authenticate.js'
import { verifyFirebaseIdToken, type TokenVerifier } from '../services/token-verifier.js'

export function createAuthRouter(verifyToken: TokenVerifier = verifyFirebaseIdToken) {
  const authRouter = Router()
  const requireAuth = createRequireAuth(verifyToken)

  authRouter.get('/session', requireAuth, (request, response) => {
    response.json({
      user: {
        uid: request.userId,
        email: request.userEmail,
        emailVerified: request.emailVerified,
      },
    })
  })

  authRouter.get('/verified', requireAuth, requireEmailVerified, (request, response) => {
    response.json({
      user: {
        uid: request.userId,
        email: request.userEmail,
        emailVerified: request.emailVerified,
      },
    })
  })

  return authRouter
}
