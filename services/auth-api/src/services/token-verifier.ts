import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getFirebaseAdminApp } from '../config/firebase-admin.js'
import { env } from '../config/env.js'

export type TokenVerifier = (idToken: string) => Promise<DecodedIdToken>

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  return getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, env.checkRevokedTokens)
}
