import type { ObjectStorage } from '@event-buddy/storage'
import { Router } from 'express'
import multer from 'multer'

import { requireAuth, requireEmailVerified } from '../../middleware/authenticate.js'
import { createImageController } from './image.controller.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

export function createImageRouter(storage?: ObjectStorage) {
  const router = Router()
  const controller = createImageController(storage)

  router.get('/users/:id/image', controller.getProfile)
  router.post(
    '/me/profile/image',
    requireAuth,
    requireEmailVerified,
    upload.single('image'),
    controller.uploadProfile,
  )
  router.delete(
    '/me/profile/image',
    requireAuth,
    requireEmailVerified,
    controller.deleteProfile,
  )

  router.get('/events/:id/image', controller.getEvent)
  router.post(
    '/events/:id/image',
    requireAuth,
    requireEmailVerified,
    upload.single('image'),
    controller.uploadEvent,
  )
  router.delete(
    '/events/:id/image',
    requireAuth,
    requireEmailVerified,
    controller.deleteEvent,
  )
  return router
}
