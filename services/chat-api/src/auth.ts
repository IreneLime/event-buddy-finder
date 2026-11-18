import { HttpError } from './errors.js'

export interface IdentityInput { token?: string; demoUserId?: string }
export type VerifyIdentity = (input: IdentityInput) => Promise<string>

export function demoIdentity(input: IdentityInput): Promise<string> {
  if (!input.demoUserId) return Promise.reject(new HttpError(401, 'UNAUTHENTICATED', 'A local development identity is required.'))
  return Promise.resolve(input.demoUserId)
}

export function authApiIdentity(origin: string): VerifyIdentity {
  const endpoint = new URL('/api/auth/session', origin)
  return async ({ token }) => {
    if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to use chat.')
    const unavailable = () => new HttpError(503, 'AUTH_UNAVAILABLE', 'Sign-in verification is unavailable. Please try again.')
    let response: Response
    try {
      response = await fetch(endpoint, {
        headers: { Authorization: 'Bearer ' + token },
        redirect: 'error',
        signal: AbortSignal.timeout(5_000),
      })
    } catch {
      throw unavailable()
    }
    if (response.status === 401) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in again.')
    if (!response.ok) throw unavailable()
    const data = await response.json().catch(() => null) as { user?: { uid?: unknown } } | null
    if (typeof data?.user?.uid !== 'string' || !data.user.uid) throw unavailable()
    return data.user.uid
  }
}
