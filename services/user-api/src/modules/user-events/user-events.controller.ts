import type { NextFunction, Request, Response } from 'express'

import { profileUserIdParamSchema } from '../profile/profile.validation.js'
import * as userEventsService from './user-events.service.js'
import { userEventsQuerySchema } from './user-events.validation.js'

export async function getEventsForUser(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = profileUserIdParamSchema.parse(request.params)
    const query = userEventsQuerySchema.parse(request.query)
    response.json(await userEventsService.getEventsForUser(id, query))
  } catch (error) {
    next(error)
  }
}
