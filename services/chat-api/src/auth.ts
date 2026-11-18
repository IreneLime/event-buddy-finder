import { HttpError } from './errors.js'

export interface IdentityInput { token?: string; demoUserId?: string }
export type VerifyIdentity = (input: IdentityInput) => Promise<string>

// Replace this with Firebase Admin verifyIdToken, and register/load the profile
// through the shared user repository. Never trust a client-supplied UID in production.
export function demoIdentity(input: IdentityInput): Promise<string> {
  if (!input.demoUserId) return Promise.reject(new HttpError(401, 'UNAUTHENTICATED', 'A local development identity is required.'))
  return Promise.resolve(input.demoUserId)
}
