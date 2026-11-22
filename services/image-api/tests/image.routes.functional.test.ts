import type { ObjectStorage } from '@event-buddy/storage'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  resolveEventImageId: vi.fn(),
  getProfileImageKey: vi.fn(),
  replaceProfileImageKey: vi.fn(),
  getEventImageKey: vi.fn(),
  replaceEventImageKey: vi.fn(),
}))

vi.mock('../src/services/auth-client.js', () => ({
  authenticateWithAuthApi: mocks.authenticate,
}))
vi.mock('../src/modules/images/image.repository.js', () => ({
  resolveEventImageId: mocks.resolveEventImageId,
  getProfileImageKey: mocks.getProfileImageKey,
  replaceProfileImageKey: mocks.replaceProfileImageKey,
  getEventImageKey: mocks.getEventImageKey,
  replaceEventImageKey: mocks.replaceEventImageKey,
}))

import { createApp } from '../src/app.js'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const storage: ObjectStorage = {
  upload: vi.fn(async () => undefined),
  delete: vi.fn(async () => undefined),
  createDownloadUrl: vi.fn(async (key: string) => `https://signed.example/${key}`),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authenticate.mockResolvedValue({
    uid: 'user-1',
    email: 'user@example.com',
    emailVerified: true,
  })
  mocks.resolveEventImageId.mockResolvedValue('9')
  mocks.getProfileImageKey.mockResolvedValue('profile-images/user-1/current.png')
  mocks.replaceProfileImageKey.mockResolvedValue({ previousKey: null })
  mocks.getEventImageKey.mockResolvedValue('event-images/9/current.png')
  mocks.replaceEventImageKey.mockResolvedValue({ previousKey: null })
})

describe('image API functional routes', () => {
  it('GET /users/:id/image returns a signed profile-image URL', async () => {
    const response = await request(createApp(storage)).get('/users/user-1/image')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      imageUrl: 'https://signed.example/profile-images/user-1/current.png',
    })
  })

  it('POST /me/profile/image uploads a verified user profile image', async () => {
    const response = await request(createApp(storage))
      .post('/me/profile/image')
      .set('Authorization', 'Bearer valid-token')
      .attach('image', png, { filename: 'profile.png', contentType: 'image/png' })

    expect(response.status).toBe(200)
    expect(storage.upload).toHaveBeenCalledOnce()
    expect(response.body.imageUrl).toMatch(/^https:\/\/signed\.example\/profile-images\/user-1\//)
  })

  it('DELETE /me/profile/image clears and deletes the profile image', async () => {
    mocks.replaceProfileImageKey.mockResolvedValueOnce({
      previousKey: 'profile-images/user-1/current.png',
    })

    const response = await request(createApp(storage))
      .delete('/me/profile/image')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(204)
    expect(storage.delete).toHaveBeenCalledWith('profile-images/user-1/current.png')
  })

  it('GET /events/:id/image returns a signed event-image URL', async () => {
    const response = await request(createApp(storage)).get('/events/9/image')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      imageUrl: 'https://signed.example/event-images/9/current.png',
    })
  })

  it('POST /events/:id/image uploads an authorized event image', async () => {
    const response = await request(createApp(storage))
      .post('/events/9/image')
      .set('Authorization', 'Bearer valid-token')
      .attach('image', png, { filename: 'event.png', contentType: 'image/png' })

    expect(response.status).toBe(200)
    expect(storage.upload).toHaveBeenCalledOnce()
    expect(response.body.imageUrl).toMatch(/^https:\/\/signed\.example\/event-images\/9\//)
  })

  it('DELETE /events/:id/image clears and deletes the event image', async () => {
    mocks.replaceEventImageKey.mockResolvedValueOnce({
      previousKey: 'event-images/9/current.png',
    })

    const response = await request(createApp(storage))
      .delete('/events/9/image')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(204)
    expect(storage.delete).toHaveBeenCalledWith('event-images/9/current.png')
  })
})
