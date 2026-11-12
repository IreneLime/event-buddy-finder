import { Router } from 'express'

import * as userEventsController from './user-events.controller.js'

export const userEventsRoutes = Router()

userEventsRoutes.get('/users/:id/events', userEventsController.getEventsForUser)
