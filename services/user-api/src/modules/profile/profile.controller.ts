import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import * as profileService from './profile.service.js'
import {
  createProfileBodySchema,
  profileUserIdParamSchema,
  updateProfileBodySchema,
} from './profile.validation.js'

function requireIdentity(request: Request): { userId: string; email: string } {
  if (!request.userId) throw new ApiError(401, 'Authentication required')
  if (!request.userEmail) throw new ApiError(400, 'Firebase account email is required')
  return { userId: request.userId, email: request.userEmail }
}

export async function getCurrentProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.userId) throw new ApiError(401, 'Authentication required')
    response.json(await profileService.getCurrentProfile(request.userId))
  } catch (error) {
    next(error)
  }
}

export async function createCurrentProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, email } = requireIdentity(request)
    const body = createProfileBodySchema.parse(request.body)
    response.status(201).json(await profileService.createCurrentProfile(userId, email, body))
  } catch (error) {
    next(error)
  }
}

export async function updateCurrentProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, email } = requireIdentity(request)
    const body = updateProfileBodySchema.parse(request.body)
    response.json(await profileService.updateCurrentProfile(userId, email, body))
  } catch (error) {
    next(error)
  }
}

export async function getPublicProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = profileUserIdParamSchema.parse(request.params)
    response.json(await profileService.getPublicProfile(id))
  } catch (error) {
    next(error)
  }
}

export async function validateProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createProfileBodySchema.parse(request.body)
    response.json(await profileService.validateProfile(body))
  } catch (error) {
    next(error)
  }
}
