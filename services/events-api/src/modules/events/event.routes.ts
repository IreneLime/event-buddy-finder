import { Router } from 'express'

import {
  optionalAuthenticate,
  requireAuth,
  requireEmailVerified,
} from '../../middleware/authenticate.js'
import * as eventController from './event.controller.js'
import * as participationController from '../participation/participation.controller.js'

export const eventRoutes = Router()

eventRoutes.get('/categories', eventController.listCategories)

eventRoutes.get('/events', optionalAuthenticate, eventController.listEvents)
eventRoutes.post(
  '/events',
  requireAuth,
  requireEmailVerified,
  eventController.createEvent,
)
eventRoutes.get('/events/:id', optionalAuthenticate, eventController.getEvent)
eventRoutes.patch('/events/:id', requireAuth, eventController.updateEvent)
eventRoutes.delete('/events/:id', requireAuth, eventController.cancelEvent)

eventRoutes.put(
  '/events/:id/participation',
  requireAuth,
  participationController.setParticipation,
)
eventRoutes.get('/events/:id/participants', participationController.listParticipants)

eventRoutes.get('/me/events', requireAuth, eventController.listMyEvents)
