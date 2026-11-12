import type { NextFunction, Request, Response } from 'express'

import { authenticateWithAuthApi } from '../services/auth-client.js'
import { ApiError } from '../utils/ApiError.js'

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header('authorization')
    if (!authorization?.startsWith('Bearer ') || authorization.slice(7).trim() === '') {
      throw new ApiError(401, 'Authentication required')
    }

    const identity = await authenticateWithAuthApi(authorization)
    request.userId = identity.uid
    request.userEmail = identity.email
    request.emailVerified = identity.emailVerified
    next()
  } catch (error) {
    next(error)
  }
}

export function requireEmailVerified(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (!request.userId) {
    next(new ApiError(401, 'Authentication required'))
    return
  }
  if (request.emailVerified !== true) {
    next(new ApiError(403, 'Email verification is required'))
    return
  }
  next()
}
