import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import pg from 'pg'

const projectId = required('FIREBASE_PROJECT_ID')
const apiKey = required('LIVE_FIREBASE_API_KEY')
const serviceAccount = JSON.parse(required('FIREBASE_SERVICE_ACCOUNT_JSON')) as {
  project_id: string
  client_email: string
  private_key: string
}
if (!projectId.endsWith('-ci')) throw new Error('Demo image publishing requires a dedicated Firebase project ending in -ci.')
if (serviceAccount.project_id !== projectId) throw new Error('Firebase service account project does not match FIREBASE_PROJECT_ID.')

const keep = process.argv.includes('--keep')
const cleanup = process.argv.includes('--cleanup')
if (keep === cleanup) throw new Error('Choose exactly one mode: --keep to publish persistent demo images, or --cleanup to verify and remove the upload.')
if (keep && process.env.PUBLISH_DEMO_IMAGES_CONFIRM !== 'UPLOAD_DEMO_IMAGES') {
  throw new Error('Set PUBLISH_DEMO_IMAGES_CONFIRM=UPLOAD_DEMO_IMAGES to keep the images in the configured demo bucket/database.')
}

const databaseUrl = required('DATABASE_URL')
const parsedDatabaseUrl = new URL(databaseUrl)
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1).split('?')[0] ?? '')
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname)
if (!isLocal && !databaseName.startsWith('event_buddy_demo_')) {
  throw new Error('Refusing to publish: remote DATABASE_URL must name a non-production event_buddy_demo_* database.')
}

const imageApi = process.env.LIVE_IMAGE_API_URL ?? 'http://127.0.0.1:4105'
const authApi = process.env.LIVE_AUTH_API_URL ?? 'http://127.0.0.1:4103'
const assetDirectory = resolve(fileURLToPath(new URL('../../../apps/web/src/assets/demo-events/', import.meta.url)))
const fixtures = [
  { eventId: 'riverside-photo-walk', file: 'toronto-park-walk.jpg' },
  { eventId: 'brampton-market', file: 'toronto-flower-market.jpg' },
  { eventId: 'toronto-clay-workshop', file: 'toronto-pottery-workshop.jpg' },
]

const adminApp = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key }),
  projectId,
}, 'demo-image-publisher')
const adminAuth = getAuth(adminApp)
const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 })
const createdAuthUsers = new Set<string>()
const originalUserState = new Map<string, { email?: string; displayName?: string; emailVerified: boolean; disabled: boolean }>()
const uploaded: Array<{ eventId: string; token: string }> = []

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) throw new Error(`${options?.method ?? 'GET'} ${new URL(url).pathname} returned ${response.status}: ${String(body?.error ?? body?.message ?? 'request failed')}`)
  return body as T
}

async function tokenFor(uid: string, email: string, displayName: string) {
  let user
  try { user = await adminAuth.getUser(uid) }
  catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
    user = await adminAuth.createUser({ uid, email, displayName, emailVerified: true })
    createdAuthUsers.add(uid)
  }
  if (!createdAuthUsers.has(uid)) {
    if (user.email && user.email !== email) throw new Error(`Firebase fixture UID ${uid} belongs to a different email; use the dedicated CI Firebase project.`)
    originalUserState.set(uid, {
      email: user.email ?? undefined,
      displayName: user.displayName ?? undefined,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
    })
    user = await adminAuth.updateUser(uid, { email, displayName, emailVerified: true, disabled: false })
  }
  const customToken = await adminAuth.createCustomToken(uid)
  const signedIn = await jsonRequest<{ idToken: string }>(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  })
  await jsonRequest(`${authApi}/api/auth/verified`, { headers: { Authorization: `Bearer ${signedIn.idToken}` } })
  return signedIn.idToken
}

async function main() {
  try {
    for (const fixture of fixtures) {
      const result = await pool.query<{ id: string; owner_id: string; email: string; display_name: string }>(
        `SELECT e.id::text, e.created_by_user_id AS owner_id, u.email, u.display_name
         FROM events e JOIN app_users u ON u.firebase_uid = e.created_by_user_id
         WHERE e.public_id = $1`, [fixture.eventId],
      )
      const event = result.rows[0]
      if (!event) throw new Error(`Seed event ${fixture.eventId} is missing. Apply database seeds 001_demo_data.sql and 002_explore_demo.sql first.`)
      const token = await tokenFor(event.owner_id, event.email, event.display_name)
      const image = await readFile(resolve(assetDirectory, fixture.file))
      const form = new FormData()
      form.set('image', new Blob([image], { type: 'image/jpeg' }), fixture.file)
      await jsonRequest(`${imageApi}/events/${encodeURIComponent(fixture.eventId)}/image`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      })
      uploaded.push({ eventId: fixture.eventId, token })

      const imageInfo = await jsonRequest<{ imageUrl: string }>(`${imageApi}/events/${encodeURIComponent(fixture.eventId)}/image`)
      const downloaded = await fetch(imageInfo.imageUrl)
      if (!downloaded.ok) throw new Error(`Signed image download for ${fixture.eventId} returned ${downloaded.status}.`)
      const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
      if (hash(new Uint8Array(await downloaded.arrayBuffer())) !== hash(image)) throw new Error(`Downloaded image for ${fixture.eventId} does not match the committed fixture.`)

      const keyResult = await pool.query<{ image_object_key: string | null }>(
        `SELECT image_object_key FROM events WHERE id = $1`, [event.id],
      )
      const key = keyResult.rows[0]?.image_object_key
      if (!key?.startsWith(`event-images/${event.id}/`)) throw new Error(`The event image key was not persisted for ${fixture.eventId}.`)
      console.info(`${keep ? 'Published' : 'Verified'} ${fixture.eventId} -> ${key}`)
    }
  } finally {
    if (cleanup) {
      for (const item of uploaded.reverse()) {
        const response = await fetch(`${imageApi}/events/${encodeURIComponent(item.eventId)}/image`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${item.token}` },
        })
        if (!response.ok) console.error(`Could not clean up the temporary image for ${item.eventId} (HTTP ${response.status}).`)
      }
    }
    for (const uid of createdAuthUsers) await adminAuth.deleteUser(uid).catch((error: Error) => console.error(`Could not delete temporary Firebase fixture user: ${error.message}`))
    for (const [uid, state] of originalUserState) await adminAuth.updateUser(uid, state).catch((error: Error) => console.error(`Could not restore Firebase fixture user ${uid}: ${error.message}`))
    await pool.end()
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name} in the protected live-integration GitHub environment.`)
  return value
}

await main()
