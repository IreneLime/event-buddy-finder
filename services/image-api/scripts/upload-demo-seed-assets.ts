import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

import { DigitalOceanSpacesStorage } from '@event-buddy/storage'

if (process.env.PUBLISH_DEMO_IMAGES_CONFIRM !== 'UPLOAD_DEMO_IMAGES') {
  throw new Error('Set PUBLISH_DEMO_IMAGES_CONFIRM=UPLOAD_DEMO_IMAGES to upload the persistent demo photos.')
}

const databaseUrl = required('DATABASE_URL')
const parsedDatabaseUrl = new URL(databaseUrl)
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1).split('?')[0] ?? '')
const localHosts = ['localhost', '127.0.0.1', '::1']
const isLocalDatabase = localHosts.includes(parsedDatabaseUrl.hostname)
  || (parsedDatabaseUrl.hostname === 'database' && databaseName === 'event_buddy_finder')
if (!isLocalDatabase && !databaseName.startsWith('event_buddy_demo_')) {
  throw new Error('Refusing to publish demo images to a remote database outside event_buddy_demo_*.')
}

const storage = new DigitalOceanSpacesStorage({
  endpoint: required('SPACES_ENDPOINT'),
  region: process.env.SPACES_REGION ?? 'us-east-1',
  bucket: required('SPACES_BUCKET'),
  accessKeyId: required('SPACES_ACCESS_KEY_ID'),
  secretAccessKey: required('SPACES_SECRET_ACCESS_KEY'),
  downloadUrlExpiresInSeconds: Number(process.env.SPACES_DOWNLOAD_URL_EXPIRES_IN_SECONDS ?? 900),
})
const imageApi = (process.env.LIVE_IMAGE_API_URL ?? 'http://127.0.0.1:4005').replace(/\/$/, '')
const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 })
const assets = resolve(fileURLToPath(new URL('../../../apps/web/src/assets/demo-events/', import.meta.url)))
const fixtures = [
  ['night-market', 'toronto-night-market.jpg'],
  ['flower-market', 'toronto-flower-market.jpg'],
  ['salsa-social', 'toronto-salsa-social.jpg'],
  ['lakeside-hangout', 'mississauga-lakeside-hangout.jpg'],
  ['demo-community-meetup', 'toronto-community-coffee.jpg'],
  ['riverside-photo-walk', 'toronto-park-walk.jpg'],
  ['toronto-clay-workshop', 'toronto-pottery-workshop.jpg'],
  ['harbourfront-sketchbook', 'toronto-harbourfront-sketchbook.jpg'],
  ['kensington-tasting', 'toronto-kensington-tasting.jpg'],
  ['toronto-board-games', 'toronto-board-games.jpg'],
  ['high-park-birds', 'toronto-high-park-birds.jpg'],
  ['toronto-acoustic', 'toronto-acoustic-coffee.jpg'],
  ['scarborough-stretch', 'scarborough-morning-stretch.jpg'],
  ['toronto-zine-swap', 'toronto-zine-swap.jpg'],
  ['parkdale-social', 'toronto-parkdale-coffee.jpg'],
  ['port-credit-walk', 'mississauga-port-credit-walk.jpg'],
  ['brampton-market', 'brampton-makers-market.jpg'],
  ['markham-gallery', 'markham-gallery-afternoon.jpg'],
  ['vaughan-dance', 'vaughan-first-steps-dance.jpg'],
  ['richmond-hill-books', 'richmond-hill-book-swap.jpg'],
  ['oakville-trail', 'oakville-creek-trail.jpg'],
  ['event-buddy-demo-meetup', 'toronto-community-meetup.jpg'],
] as const
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

try {
  for (const [publicId, file] of fixtures) {
    const result = await pool.query<{ id: string }>(
      'SELECT id::text FROM events WHERE public_id = $1', [publicId],
    )
    const event = result.rows[0]
    if (!event) throw new Error(`Seed event ${publicId} is missing. Apply the local demo seeds first.`)

    const bytes = await readFile(resolve(assets, file))
    const key = `event-images/${publicId}/${file}`
    await storage.upload({
      key,
      body: bytes,
      contentType: 'image/jpeg',
      cacheControl: 'private, max-age=3600',
    })
    await pool.query('UPDATE events SET image_object_key = $2, updated_at = NOW() WHERE id = $1', [event.id, key])

    const response = await fetch(`${imageApi}/events/${encodeURIComponent(event.id)}/image`)
    if (!response.ok) throw new Error(`Image API lookup for ${publicId} returned ${response.status}.`)
    const { imageUrl } = await response.json() as { imageUrl: string }
    const downloaded = await fetch(imageUrl)
    if (!downloaded.ok) throw new Error(`Spaces signed download for ${publicId} returned ${downloaded.status}.`)
    if (hash(new Uint8Array(await downloaded.arrayBuffer())) !== hash(bytes)) {
      throw new Error(`Downloaded image for ${publicId} did not match the committed fixture.`)
    }
    console.info(`Published and verified ${publicId} -> ${key}`)
  }
} finally {
  await pool.end()
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name} in .env before uploading demo images.`)
  return value
}
