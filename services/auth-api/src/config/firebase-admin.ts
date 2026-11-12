import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app'
import { env } from './env.js'

function requireProjectId() {
  const projectId = env.firebaseProjectId?.trim()
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required')
  return projectId
}

function serviceAccountFromEnvironment(): ServiceAccount | null {
  const rawServiceAccount = env.firebaseServiceAccountJson
  if (!rawServiceAccount) return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawServiceAccount) as Record<string, unknown>
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON')
  }

  const projectId = parsed.project_id
  const clientEmail = parsed.client_email
  const privateKey = parsed.private_key

  if (typeof projectId !== 'string' || typeof clientEmail !== 'string' || typeof privateKey !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields')
  }

  return { projectId, clientEmail, privateKey }
}

function serviceAccountFromFields(): ServiceAccount | null {
  if (!env.firebaseClientEmail || !env.firebasePrivateKey) return null
  return {
    projectId: requireProjectId(),
    clientEmail: env.firebaseClientEmail,
    privateKey: env.firebasePrivateKey,
  }
}

export function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0]
  if (existingApp) return existingApp

  const projectId = requireProjectId()

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId })
  }

  const serviceAccount = serviceAccountFromEnvironment() ?? serviceAccountFromFields()
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId,
  })
}
