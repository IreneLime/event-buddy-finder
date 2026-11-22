import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import pg from 'pg'

const apiKey = required('LIVE_FIREBASE_API_KEY')
const projectId = required('FIREBASE_PROJECT_ID')
const serviceAccount = JSON.parse(required('FIREBASE_SERVICE_ACCOUNT_JSON')) as {
  project_id: string
  client_email: string
  private_key: string
}
if (!projectId.endsWith('-ci')) throw new Error('Live tests require a dedicated Firebase project ending in -ci.')
if (serviceAccount.project_id !== projectId) throw new Error('Firebase service account project does not match FIREBASE_PROJECT_ID.')

const databaseUrl = required('DATABASE_URL')
const db = new URL(databaseUrl)
const databaseName = decodeURIComponent(db.pathname.slice(1).split('?')[0] ?? '')
if (!databaseName.startsWith('event_buddy_e2e')) {
  throw new Error('Refusing live test writes: DATABASE_URL must use an event_buddy_e2e database.')
}

const authBase = process.env.LIVE_AUTH_API_URL ?? 'http://127.0.0.1:4103'
const usersBase = process.env.LIVE_USERS_API_URL ?? 'http://127.0.0.1:4104'
const eventsBase = process.env.LIVE_EVENTS_API_URL ?? 'http://127.0.0.1:4101'
const imagesBase = process.env.LIVE_IMAGE_API_URL ?? 'http://127.0.0.1:4105'
const authRest = `https://identitytoolkit.googleapis.com/v1`
const email = `live-${randomUUID()}@example.test`
const password = `${randomUUID()}!Aa1`
const asset = resolve(fileURLToPath(new URL('../../../apps/web/src/assets/demo-events/toronto-park-walk.jpg', import.meta.url)))

const adminApp = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key }),
  projectId,
}, 'live-cloud-smoke')
const adminAuth = getAuth(adminApp)
const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 })

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) throw new Error(`${options?.method ?? 'GET'} ${new URL(url).pathname} returned ${response.status}: ${String(body?.error ?? body?.message ?? 'request failed')}`)
  return body as T
}

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` } }

async function main() {
  let userId: string | undefined
  let idToken: string | undefined
  let eventId: string | undefined
  let imageUploaded = false

  try {
    const created = await jsonRequest<{ localId: string }>(`${authRest}/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    })
    userId = created.localId
    console.info('Created a disposable account through Firebase Authentication.')

    const unverifiedLogin = await jsonRequest<{ idToken: string }>(`${authRest}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    })
    const denied = await fetch(`${authBase}/api/auth/verified`, { headers: authHeaders(unverifiedLogin.idToken) })
    if (denied.status !== 403) throw new Error(`Unverified Firebase account should be rejected by the backend, got ${denied.status}.`)

    const verificationLink = await adminAuth.generateEmailVerificationLink(email)
    const code = new URL(verificationLink).searchParams.get('oobCode')
    if (!code) throw new Error('Firebase did not return an email-verification action code.')
    const verified = await jsonRequest<{ emailVerified: boolean }>(`${authRest}/accounts:update?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode: code }),
    })
    if (!verified.emailVerified) throw new Error('Firebase did not mark the test account verified.')
    const verifiedLogin = await jsonRequest<{ idToken: string }>(`${authRest}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    })
    idToken = verifiedLogin.idToken

    const session = await jsonRequest<{ user: { uid: string; emailVerified: boolean } }>(`${authBase}/api/auth/verified`, { headers: authHeaders(idToken) })
    if (session.user.uid !== userId || session.user.emailVerified !== true) throw new Error('Backend verified a different or unverified Firebase identity.')

    await jsonRequest(`${usersBase}/me/profile`, {
      method: 'POST', headers: { ...authHeaders(idToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Live CI Test', ageRange: '25_34', affiliation: 'Event Buddy live integration', bio: 'Temporary live-service integration account.', preferredCategories: ['Outdoors'] }),
    })

    const startsAt = new Date(Date.now() + 7 * 86_400_000)
    const endsAt = new Date(startsAt.getTime() + 2 * 3_600_000)
    const event = await jsonRequest<{ id: string; title: string }>(`${eventsBase}/events`, {
      method: 'POST', headers: { ...authHeaders(idToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Live cloud test ${randomUUID().slice(0, 8)}`,
        description: 'Temporary event used to check Firebase identity, PostgreSQL, and DigitalOcean Spaces together.',
        startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), locationName: 'Trinity Bellwoods Park',
        city: 'Toronto', categoryNames: ['Outdoors'], priceAmount: 0,
      }),
    })
    eventId = event.id

    const image = await readFile(asset)
    const form = new FormData()
    form.set('image', new Blob([image], { type: 'image/jpeg' }), 'toronto-park-walk.jpg')
    await jsonRequest(`${imagesBase}/events/${encodeURIComponent(eventId)}/image`, {
      method: 'POST', headers: authHeaders(idToken), body: form,
    })
    imageUploaded = true

    const row = await pool.query<{ image_object_key: string | null }>(
      'SELECT image_object_key FROM events WHERE id::text = $1 OR public_id = $1', [eventId],
    )
    const objectKey = row.rows[0]?.image_object_key
    if (!objectKey || !objectKey.startsWith('event-images/')) throw new Error('The image API did not persist the Spaces object key in PostgreSQL.')

    const imageInfo = await jsonRequest<{ imageUrl: string }>(`${imagesBase}/events/${encodeURIComponent(eventId)}/image`)
    const downloaded = await fetch(imageInfo.imageUrl)
    if (!downloaded.ok) throw new Error(`Spaces signed download returned ${downloaded.status}.`)
    const downloadedBytes = Buffer.from(await downloaded.arrayBuffer())
    const expectedHash = createHash('sha256').update(image).digest('hex')
    const downloadedHash = createHash('sha256').update(downloadedBytes).digest('hex')
    if (expectedHash !== downloadedHash) throw new Error('The downloaded Spaces image differs from the uploaded fixture.')

    console.info(`Firebase signup/verification, backend profile/event writes, Spaces upload/download, and PostgreSQL object-key persistence passed for event ${eventId}.`)
  } finally {
    if (eventId && idToken && imageUploaded) {
      const removal = await fetch(`${imagesBase}/events/${encodeURIComponent(eventId)}/image`, { method: 'DELETE', headers: authHeaders(idToken) })
      if (!removal.ok) console.error(`Could not remove the temporary Spaces object (HTTP ${removal.status}).`)
    }
    if (userId) await adminAuth.deleteUser(userId).catch((error: Error) => console.error(`Could not delete temporary Firebase user: ${error.message}`))
    await pool.end()
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name} in the protected live-integration GitHub environment.`)
  return value
}

await main()
