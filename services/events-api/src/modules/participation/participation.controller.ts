import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import { eventIdParamSchema } from '../events/event.validation.js'
import * as participationService from './participation.service.js'
import {
  participantsQuerySchema,
  setParticipationBodySchema,
} from './participation.validation.js'

export async function setParticipation(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) {
      throw new ApiError(401, 'Authentication required')
    }
    const { id } = eventIdParamSchema.parse(request.params)
    const body = setParticipationBodySchema.parse(request.body)
    const event = await participationService.setParticipation(id, request.userId, body.status)
    response.json(event)
  } catch (error) {
    next(error)
  }
}

export async function listParticipants(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = eventIdParamSchema.parse(request.params)
    const query = participantsQuerySchema.parse(request.query)
    const result = await participationService.listParticipants(id, query)
    response.json(result)
  } catch (error) {
    next(error)
  }
}
