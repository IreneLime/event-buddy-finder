import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'

const { VITE_FIREBASE_API_KEY: apiKey, VITE_FIREBASE_AUTH_DOMAIN: authDomain,
  VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_AUTH_EMULATOR_URL: emulatorUrl } = import.meta.env

export const firebaseAuth = apiKey && projectId ? getAuth(initializeApp({ apiKey, authDomain, projectId })) : null

if (firebaseAuth && emulatorUrl) connectAuthEmulator(firebaseAuth, emulatorUrl)
