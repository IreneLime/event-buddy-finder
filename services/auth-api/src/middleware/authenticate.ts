import type { NextFunction, Request, Response } from 'express'
import { verifyFirebaseIdToken, type TokenVerifier } from '../services/token-verifier.js'
import { ApiError } from '../utils/ApiError.js'

const invalidTokenErrorCodes = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
])

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }

  return undefined
}

function normalizeAuthenticationError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  const code = getErrorCode(error)
  if (code && invalidTokenErrorCodes.has(code)) {
    return new ApiError(401, 'Invalid or expired authentication token')
  }

  console.error('Firebase token verification failed', error)
  return new ApiError(503, 'Authentication service is unavailable')
}

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
    } catch (error) {
      next(normalizeAuthenticationError(error))
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
      next(normalizeAuthenticationError(error))
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
