import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import { meEventsQuerySchema } from '../participation/participation.validation.js'
import * as eventService from './event.service.js'
import {
  createEventBodySchema,
  eventIdParamSchema,
  eventListQuerySchema,
  updateEventBodySchema,
} from './event.validation.js'

export async function listEvents(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = eventListQuerySchema.parse(request.query)
    const result = await eventService.listEvents(request.userId, query)
    response.json(result)
  } catch (error) {
    next(error)
  }
}

export async function getEvent(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = eventIdParamSchema.parse(request.params)
    const event = await eventService.getEvent(id, request.userId)
    response.json(event)
  } catch (error) {
    next(error)
  }
}

export async function createEvent(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) {
      throw new ApiError(401, 'Authentication required')
    }
    const body = createEventBodySchema.parse(request.body)
    const event = await eventService.createEvent(request.userId, body)
    response.status(201).json(event)
  } catch (error) {
    next(error)
  }
}

export async function updateEvent(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) {
      throw new ApiError(401, 'Authentication required')
    }
    const { id } = eventIdParamSchema.parse(request.params)
    const body = updateEventBodySchema.parse(request.body)
    const event = await eventService.updateEvent(id, request.userId, body)
    response.json(event)
  } catch (error) {
    next(error)
  }
}

export async function cancelEvent(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) {
      throw new ApiError(401, 'Authentication required')
    }
    const { id } = eventIdParamSchema.parse(request.params)
    const event = await eventService.cancelEvent(id, request.userId)
    response.json(event)
  } catch (error) {
    next(error)
  }
}

export async function listCategories(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await eventService.listCategories()
    response.json({ items: categories })
  } catch (error) {
    next(error)
  }
}

export async function listMyEvents(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) {
      throw new ApiError(401, 'Authentication required')
    }
    const query = meEventsQuerySchema.parse(request.query)
    const result = await eventService.listMyEvents(request.userId, query)
    response.json(result)
  } catch (error) {
    next(error)
  }
}
