import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  getProfileById: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  findMissingCategories: vi.fn(),
  listPastEventsForUser: vi.fn(),
}))

vi.mock('../src/services/auth-client.js', () => ({
  authenticateWithAuthApi: mocks.authenticate,
}))
vi.mock('../src/modules/profile/profile.repository.js', () => ({
  getProfileById: mocks.getProfileById,
  createProfile: mocks.createProfile,
  updateProfile: mocks.updateProfile,
  findMissingCategories: mocks.findMissingCategories,
}))
vi.mock('../src/modules/user-events/user-events.repository.js', () => ({
  listPastEventsForUser: mocks.listPastEventsForUser,
}))

import { createApp } from '../src/app.js'

const profile = {
  firebase_uid: 'user-1',
  email: 'user@example.com',
  display_name: 'Irene',
  age_range: '18_24',
  affiliation: 'University of Toronto',
  bio: 'Concert fan',
  profile_image_key: null,
  profile_completed_at: '2026-11-18T12:00:00.000Z',
  preferred_categories: ['Music'],
}

const profileBody = {
  displayName: 'Irene',
  ageRange: '18_24',
  affiliation: 'University of Toronto',
  bio: 'Concert fan',
  preferredCategories: ['Music'],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authenticate.mockResolvedValue({
    uid: 'user-1',
    email: 'user@example.com',
    emailVerified: true,
  })
  mocks.getProfileById.mockResolvedValue(profile)
  mocks.createProfile.mockResolvedValue(profile)
  mocks.updateProfile.mockResolvedValue(profile)
  mocks.findMissingCategories.mockResolvedValue([])
  mocks.listPastEventsForUser.mockResolvedValue({
    rows: [
      {
        id: 9,
        title: 'Past concert',
        description: 'A completed event',
        starts_at: '2026-10-01T19:00:00.000Z',
        ends_at: '2026-10-01T21:00:00.000Z',
        location_name: 'Toronto',
        address: null,
        price_amount: '20',
        capacity: 100,
        status: 'scheduled',
        organizer_name: 'Organizer',
        participant_count: 12,
        category_names: ['Music'],
      },
    ],
    total: 1,
  })
})

describe('user API functional routes', () => {
  it('GET /me/profile returns the signed-in user profile', async () => {
    const response = await request(createApp())
      .get('/me/profile')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 'user-1', email: 'user@example.com' })
  })

  it('POST /me/profile creates a profile for a verified user', async () => {
    const response = await request(createApp())
      .post('/me/profile')
      .set('Authorization', 'Bearer valid-token')
      .send(profileBody)

    expect(response.status).toBe(201)
    expect(mocks.createProfile).toHaveBeenCalledWith(
      'user-1',
      'user@example.com',
      profileBody,
    )
  })

  it('PATCH /me/profile updates selected profile fields', async () => {
    const response = await request(createApp())
      .patch('/me/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ bio: 'Updated bio' })

    expect(response.status).toBe(200)
    expect(mocks.updateProfile).toHaveBeenCalledWith('user-1', 'user@example.com', {
      bio: 'Updated bio',
    })
  })

  it('GET /users/:id returns only public profile fields', async () => {
    const response = await request(createApp()).get('/users/user-1')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: 'user-1',
      displayName: 'Irene',
      bio: 'Concert fan',
      preferredCategories: ['Music'],
    })
  })

  it('POST /profiles/validate validates and normalizes profile input', async () => {
    const response = await request(createApp()).post('/profiles/validate').send(profileBody)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ valid: true, profile: profileBody })
  })

  it('GET /users/:id/events returns paginated event history', async () => {
    const response = await request(createApp()).get('/users/user-1/events?page=1&limit=10')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ page: 1, limit: 10, total: 1 })
    expect(response.body.items[0]).toMatchObject({ id: '9', title: 'Past concert' })
  })
})
