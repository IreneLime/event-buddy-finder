import type { NextFunction, Request, Response } from 'express'
import { verifyFirebaseIdToken, type TokenVerifier } from '../services/token-verifier.js'
import { ApiError } from '../utils/ApiError.js'

function readBearer(request: Request): string | undefined {
  const header = request.header('authorization')
  if (!header?.startsWith('Bearer ')) return undefined
  return header.slice('Bearer '.length).trim() || undefined
}

function setAuthenticatedUser(
  request: Request,
  decodedToken: Awaited<ReturnType<TokenVerifier>>,
): void {
  request.userId = decodedToken.uid
  request.userEmail = decodedToken.email ?? null
  request.emailVerified = decodedToken.email_verified === true
}

export function createOptionalAuthenticate(
  verifyToken: TokenVerifier = verifyFirebaseIdToken,
) {
  return async function optionalAuthenticate(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = readBearer(request)
      if (!token) {
        next()
        return
      }

      setAuthenticatedUser(request, await verifyToken(token))
      next()
    } catch {
      next(new ApiError(401, 'Invalid or expired authentication token'))
    }
  }
}

export function createRequireAuth(verifyToken: TokenVerifier = verifyFirebaseIdToken) {
  return async function requireAuth(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const token = readBearer(request)
      if (!token) throw new ApiError(401, 'Authentication required')

      setAuthenticatedUser(request, await verifyToken(token))
      next()
    } catch (error) {
      next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired authentication token'))
    }
  }
}

export const optionalAuthenticate = createOptionalAuthenticate()
export const requireAuth = createRequireAuth()

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
