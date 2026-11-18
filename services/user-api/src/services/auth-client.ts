import { z } from 'zod'

import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const authSessionSchema = z.object({
  user: z.object({
    uid: z.string().min(1),
    email: z.string().email().nullable(),
    emailVerified: z.boolean(),
  }),
})

export interface AuthenticatedIdentity {
  uid: string
  email: string | null
  emailVerified: boolean
}

export async function authenticateWithAuthApi(
  authorization: string,
): Promise<AuthenticatedIdentity> {
  let response: globalThis.Response
  try {
    response = await fetch(`${env.authApiUrl}/api/auth/session`, {
      headers: { authorization },
      signal: AbortSignal.timeout(env.authApiTimeoutMs),
    })
  } catch {
    throw new ApiError(503, 'Authentication service is unavailable')
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }
  if (!response.ok) {
    throw new ApiError(503, 'Authentication service is unavailable')
  }

  const parsed = authSessionSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new ApiError(503, 'Authentication service returned an invalid response')
  }

  return parsed.data.user
}
