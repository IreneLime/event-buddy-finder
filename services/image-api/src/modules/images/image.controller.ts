import type { ObjectStorage } from '@event-buddy/storage'
import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import * as imageService from './image.service.js'
import { eventIdParamSchema, userIdParamSchema } from './image.validation.js'

export function createImageController(storage?: ObjectStorage) {
  return {
    uploadProfile: async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.userId) throw new ApiError(401, 'Authentication required')
        if (!request.file) throw new ApiError(400, 'Image file is required')
        response.json(
          await imageService.uploadProfileImage(request.userId, request.file, storage),
        )
      } catch (error) {
        next(error)
      }
    },
    deleteProfile: async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.userId) throw new ApiError(401, 'Authentication required')
        await imageService.deleteProfileImage(request.userId, storage)
        response.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    getProfile: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { id } = userIdParamSchema.parse(request.params)
        response.json(await imageService.getProfileImage(id, storage))
      } catch (error) {
        next(error)
      }
    },
    uploadEvent: async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.userId) throw new ApiError(401, 'Authentication required')
        if (!request.file) throw new ApiError(400, 'Image file is required')
        const { id } = eventIdParamSchema.parse(request.params)
        response.json(
          await imageService.uploadEventImage(id, request.userId, request.file, storage),
        )
      } catch (error) {
        next(error)
      }
    },
    deleteEvent: async (request: Request, response: Response, next: NextFunction) => {
      try {
        if (!request.userId) throw new ApiError(401, 'Authentication required')
        const { id } = eventIdParamSchema.parse(request.params)
        await imageService.deleteEventImage(id, request.userId, storage)
        response.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    getEvent: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { id } = eventIdParamSchema.parse(request.params)
        response.json(await imageService.getEventImage(id, storage))
      } catch (error) {
        next(error)
      }
    },
  }
}
