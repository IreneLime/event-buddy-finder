import { firebaseAuth } from './firebase'

export async function apiIdentity(userId: string) {
  if (firebaseAuth) {
    const current = firebaseAuth.currentUser
    if (current?.uid !== userId) throw new Error('Please sign in again.')
    return { token: await current.getIdToken() }
  }
  return { demoUserId: import.meta.env.DEV ? userId : undefined }
}
