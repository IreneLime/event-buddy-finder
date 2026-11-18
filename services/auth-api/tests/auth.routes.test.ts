import type { DecodedIdToken } from 'firebase-admin/auth'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../src/app.js'
import type { TokenVerifier } from '../src/services/token-verifier.js'

function decodedToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    uid: 'firebase-user-1',
    sub: 'firebase-user-1',
    email: 'user@example.com',
    email_verified: true,
    aud: 'event-buddy-finder',
    auth_time: 1,
    exp: 2,
    firebase: {
      identities: {},
      sign_in_provider: 'password',
    },
    iat: 1,
    iss: 'https://securetoken.google.com/event-buddy-finder',
    ...overrides,
  } as DecodedIdToken
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authentication routes', () => {
  it('returns the health status', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ service: 'auth-api', status: 'ok' })
  })

  it('returns 401 when the Bearer token is missing', async () => {
    const response = await request(createApp()).get('/api/auth/session')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Authentication required' })
  })

  it('returns the authenticated session', async () => {
    const verifyToken: TokenVerifier = async () => decodedToken()

    const response = await request(createApp({ verifyIdToken: verifyToken }))
      .get('/api/auth/session')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      user: {
        uid: 'firebase-user-1',
        email: 'user@example.com',
        emailVerified: true,
      },
    })
  })

  it('returns 401 for an invalid Firebase token', async () => {
    const verifyToken: TokenVerifier = async () => {
      throw Object.assign(new Error('Invalid token'), {
        code: 'auth/invalid-id-token',
      })
    }

    const response = await request(createApp({ verifyIdToken: verifyToken }))
      .get('/api/auth/session')
      .set('Authorization', 'Bearer invalid-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Invalid or expired authentication token',
    })
  })

  it('returns 503 when Firebase is unavailable or misconfigured', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const verifyToken: TokenVerifier = async () => {
      throw new Error('FIREBASE_PROJECT_ID is required')
    }

    const response = await request(createApp({ verifyIdToken: verifyToken }))
      .get('/api/auth/session')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      error: 'Authentication service is unavailable',
    })
    expect(logError).toHaveBeenCalledOnce()
  })

  it('returns 403 when the user email is not verified', async () => {
    const verifyToken: TokenVerifier = async () =>
      decodedToken({ email_verified: false })

    const response = await request(createApp({ verifyIdToken: verifyToken }))
      .get('/api/auth/verified')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'Email verification is required',
    })
  })

  it('allows a verified user', async () => {
    const verifyToken: TokenVerifier = async () => decodedToken()

    const response = await request(createApp({ verifyIdToken: verifyToken }))
      .get('/api/auth/verified')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body.user.emailVerified).toBe(true)
  })
})
