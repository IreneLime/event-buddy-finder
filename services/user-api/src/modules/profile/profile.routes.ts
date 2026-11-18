import { Router } from 'express'

import { requireAuth, requireEmailVerified } from '../../middleware/authenticate.js'
import * as profileController from './profile.controller.js'

export const profileRoutes = Router()

profileRoutes.get('/me/profile', requireAuth, profileController.getCurrentProfile)
profileRoutes.post(
  '/me/profile',
  requireAuth,
  requireEmailVerified,
  profileController.createCurrentProfile,
)
profileRoutes.patch(
  '/me/profile',
  requireAuth,
  requireEmailVerified,
  profileController.updateCurrentProfile,
)
profileRoutes.get('/users/:id', profileController.getPublicProfile)
profileRoutes.post('/profiles/validate', profileController.validateProfile)
