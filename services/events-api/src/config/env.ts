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

export const env = {
  port: Number(process.env.PORT ?? 4001),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  get databaseUrl() {
    return (
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/event_buddy_finder'
    )
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development'
  },
  // Read auth flags on each access so integration tests can toggle them after import.
  get allowDevAuth() {
    return isDevAuthEnabled({
      allowDevAuth: process.env.ALLOW_DEV_AUTH,
      nodeEnv: process.env.NODE_ENV,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    })
  },
  get firebaseProjectId() {
    return process.env.FIREBASE_PROJECT_ID
  },
  get firebaseClientEmail() {
    return process.env.FIREBASE_CLIENT_EMAIL
  },
  get firebasePrivateKey() {
    return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
}
