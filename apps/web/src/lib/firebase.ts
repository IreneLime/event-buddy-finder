import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type ActionCodeSettings } from 'firebase/auth'

const { VITE_FIREBASE_API_KEY: apiKey, VITE_FIREBASE_AUTH_DOMAIN: authDomain,
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_USE_FIREBASE_AUTH_EMULATOR: useAuthEmulator,
  VITE_FIREBASE_AUTH_EMULATOR_URL: emulatorUrl,
  VITE_EMAIL_VERIFICATION_CONTINUE_URL: emailVerificationContinueUrl } = import.meta.env

export const firebaseAuth = apiKey && projectId ? getAuth(initializeApp({ apiKey, authDomain, projectId })) : null

if (firebaseAuth && useAuthEmulator === 'true' && emulatorUrl) {
  connectAuthEmulator(firebaseAuth, emulatorUrl)
}

export const emailVerificationActionCodeSettings: ActionCodeSettings | undefined =
  emailVerificationContinueUrl ? { url: emailVerificationContinueUrl } : undefined
