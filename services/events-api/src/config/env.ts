import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

try {
  loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

export function isDevAuthEnabled(options: {
  allowDevAuth?: string
  nodeEnv?: string
  firebaseProjectId?: string
}): boolean {
  const requested = (options.allowDevAuth ?? 'false').toLowerCase() === 'true'
  const isProduction = (options.nodeEnv ?? 'development') === 'production'
  const firebaseConfigured = Boolean(options.firebaseProjectId)

  // Opt-in, local-only, and never alongside Firebase.
  return requested && !isProduction && !firebaseConfigured
}

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID

export const env = {
  port: Number(process.env.PORT ?? 4001),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/event_buddy_finder',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  allowDevAuth: isDevAuthEnabled({
    allowDevAuth: process.env.ALLOW_DEV_AUTH,
    nodeEnv: process.env.NODE_ENV,
    firebaseProjectId,
  }),
  firebaseProjectId,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}
