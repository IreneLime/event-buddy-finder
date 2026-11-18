import type { NextFunction, Request, Response } from 'express'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

function ensureFirebase(): boolean {
  if (!env.firebaseProjectId) {
    return false
  }

  if (getApps().length === 0) {
    if (env.firebaseClientEmail && env.firebasePrivateKey) {
      initializeApp({
        credential: cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: env.firebasePrivateKey,
        }),
      })
    } else {
      initializeApp({
        projectId: env.firebaseProjectId,
      })
    }
  }

  return true
}

async function resolveBearer(token: string): Promise<{ userId: string; emailVerified: boolean }> {
  if (env.allowDevAuth && token.startsWith('dev:')) {
    const userId = token.slice('dev:'.length).trim()
    if (!userId) {
      throw new ApiError(401, 'Invalid development auth token')
    }
    return { userId, emailVerified: true }
  }

  if (!ensureFirebase()) {
    throw new ApiError(
      401,
      'Firebase authentication is not configured. Use Authorization: Bearer dev:<firebase_uid> for local development.',
    )
  }

  try {
    const decoded = await getAuth().verifyIdToken(token)
    return {
      userId: decoded.uid,
      emailVerified: Boolean(decoded.email_verified),
    }
  } catch {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }
}

function readBearer(request: Request): string | undefined {
  const header = request.header('authorization')
  if (!header?.startsWith('Bearer ')) {
    return undefined
  }
  return header.slice('Bearer '.length).trim() || undefined
}

export async function optionalAuthenticate(
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

    const identity = await resolveBearer(token)
    request.userId = identity.userId
    request.emailVerified = identity.emailVerified
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readBearer(request)
    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }

    const identity = await resolveBearer(token)
    request.userId = identity.userId
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
  if (request.emailVerified === false) {
    next(new ApiError(403, 'Email verification is required before creating events'))
    return
  }
  next()
}
