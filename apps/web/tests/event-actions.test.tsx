import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { EventSummary } from '@event-buddy/contracts'
import { AuthProvider } from '../src/state/auth-store'
import { EventStoreProvider } from '../src/state/event-store'
import { EventFormPage } from '../src/pages/event-form-page'
import { EventDetailPage } from '../src/pages/event-detail-page'
import { EventsPage } from '../src/pages/events-page'
import { HomePage } from '../src/pages/home-page'
import { ProfilePage } from '../src/pages/profile-page'
import { ExploreCityProvider } from '../src/state/explore-city'

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), cancel: vi.fn(), participate: vi.fn() }))
vi.mock('../src/lib/backend-api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/backend-api')>(),
  eventsApiUrl: 'http://localhost:4001',
  eventApi: {
    ...api,
    save: (body: unknown, _token: string, id?: string) => id ? api.update(id, body) : api.create(body),
    categories: async () => ['Food', 'Community'],
    hosted: async () => [],
    participants: async () => ({ total: 2, items: [] }),
  },
  imageApi: { get: async () => ({}) },
}))
vi.mock('../src/components/events-map', () => ({ EventMapPreview: () => <div>Map preview</div> }))

let event: EventSummary
beforeEach(() => {
  vi.resetAllMocks()
  window.localStorage.clear()
  window.localStorage.setItem('event-buddy-demo-user', 'mina')
  event = {
    id: 'night-market', title: 'Lanterns and Late Bites', description: 'A sample event with details that can be edited.',
    startsAt: '2026-11-15T23:30:00.000Z', endsAt: '2026-11-16T02:30:00.000Z', locationName: 'Stackt Market',
    city: 'Toronto', notes: 'Meet at the entrance.', categoryNames: ['Food', 'Community'],
    organizerName: 'Mina Park', organizerUserId: 'demo-mina', participantCount: 2, status: 'scheduled', priceAmount: 0,
  }
  api.list.mockImplementation(async () => [event])
  api.get.mockImplementation(async () => event)
  api.update.mockImplementation(async (_id, body) => ({ ...event, ...body }))
  api.create.mockImplementation(async (body) => ({ ...event, ...body, id: 'created-event' }))
  api.cancel.mockImplementation(async () => ({ ...event, status: 'cancelled' }))
  api.participate.mockImplementation(async (_id, status) => ({ ...event, viewerParticipation: status }))
})
afterEach(cleanup)

function SavedEvent() { return <h1>Saved event {useParams().eventId}</h1> }
function mount(edit: boolean) {
  return render(<AuthProvider><EventStoreProvider><MemoryRouter initialEntries={[edit ? '/events/night-market/edit' : '/events/night-market']}><Routes>
    <Route path="/events/:eventId/edit" element={<EventFormPage />} />
    <Route path="/events/:eventId" element={edit ? <SavedEvent /> : <EventDetailPage />} />
  </Routes></MemoryRouter></EventStoreProvider></AuthProvider>)
}

function mountCreate() {
  return render(<AuthProvider><EventStoreProvider><MemoryRouter initialEntries={['/events/new']}><Routes>
    <Route path="/events/new" element={<EventFormPage />} />
    <Route path="/events/:eventId" element={<SavedEvent />} />
  </Routes></MemoryRouter></EventStoreProvider></AuthProvider>)
}

it.each([[0, 'Free'], [12, '$12']] as const)('shows the event price for %s', async (priceAmount, label) => {
  event = { ...event, priceAmount }
  mount(false)
  expect(await screen.findByText(label, { exact: true })).toBeTruthy()
})

it('places meeting notes in a separate card from the event description', async () => {
  mount(false)
  const about = await screen.findByRole('heading', { name: 'About this event' })
  const notes = screen.getByRole('heading', { name: 'Where to meet & what to know' })
  expect(about.parentElement?.nextElementSibling).toBe(notes.parentElement)
})

it('returns to the same event from the organizer’s profile', async () => {
  event = { ...event, organizerUserId: 'mina' }
  render(<AuthProvider><EventStoreProvider><MemoryRouter initialEntries={['/events/night-market']}><Routes>
    <Route path="/events/:eventId" element={<EventDetailPage />} />
    <Route path="/profile/:userId" element={<ProfilePage />} />
  </Routes></MemoryRouter></EventStoreProvider></AuthProvider>)
  fireEvent.click(await screen.findByRole('link', { name: 'View profile' }))
  const back = await screen.findByRole('link', { name: 'Back to event' })
  expect(back.getAttribute('href')).toBe('/events/night-market')
  fireEvent.click(back)
  await screen.findByRole('heading', { name: event.title })
})

it.each([HomePage, EventsPage])('shows only upcoming events on %s', async (Page) => {
  const upcoming = { ...event, id: 'upcoming', title: 'Upcoming market', startsAt: new Date(Date.now() + 86_400_000).toISOString() }
  event = { ...event, startsAt: new Date(Date.now() - 86_400_000).toISOString() }
  api.list.mockResolvedValue([event, upcoming])
  render(<AuthProvider><EventStoreProvider><ExploreCityProvider><MemoryRouter>
    <Page />
  </MemoryRouter></ExploreCityProvider></EventStoreProvider></AuthProvider>)
  await screen.findByRole('link', { name: 'View Upcoming market' })
  expect(screen.queryByRole('link', { name: `View ${event.title}` })).toBeNull()
})

it('saves event edits through the backend without shifting time or dropping existing categories', async () => {
  mount(true)
  const title = await screen.findByDisplayValue(event.title)
  fireEvent.change(title, { target: { value: 'Updated market title' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByRole('heading', { name: 'Saved event night-market' })
  expect(api.update).toHaveBeenCalledWith('night-market', expect.objectContaining({
    title: 'Updated market title', startsAt: event.startsAt, endsAt: event.endsAt,
    categoryNames: ['Food', 'Community'], city: 'Toronto', notes: 'Meet at the entrance.',
  }))
})

it('clears an existing optional end time by sending null to the API', async () => {
  const { container } = mount(true)
  await screen.findByDisplayValue(event.title)
  const endTime = container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[1]
  expect(endTime.value).not.toBe('')
  fireEvent.change(endTime, { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByRole('heading', { name: 'Saved event night-market' })
  expect(api.update).toHaveBeenCalledWith('night-market', expect.objectContaining({ endsAt: null }))
})

it('leaves an event without an end time blank during title-only edits', async () => {
  event = { ...event, endsAt: undefined }
  const { container } = mount(true)
  const title = await screen.findByDisplayValue(event.title)
  const endTime = container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[1]
  expect(endTime.value).toBe('')
  fireEvent.change(title, { target: { value: 'Updated without an end time' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByRole('heading', { name: 'Saved event night-market' })
  expect(api.update).toHaveBeenCalledWith('night-market', expect.objectContaining({
    title: 'Updated without an end time', endsAt: null,
  }))
})

it('keeps the optional end time blank when a new event start date changes', async () => {
  const { container } = mountCreate()
  fireEvent.change(await screen.findByPlaceholderText('e.g. Sunday Clay Club'), { target: { value: 'A month-away park walk' } })
  fireEvent.change(screen.getByPlaceholderText('Tell people what makes this event special…'), {
    target: { value: 'A relaxed walk with time to meet neighbours and enjoy the park.' },
  })
  const dateTimeFields = container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')
  const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60_000)
  const localStart = new Date(futureStart.getTime() - futureStart.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  fireEvent.change(dateTimeFields[0]!, { target: { value: localStart } })
  expect(dateTimeFields[1]!.value).toBe('')
  fireEvent.change(container.querySelector('form select')!, { target: { value: 'Community' } })
  fireEvent.change(container.querySelectorAll('form select')[1]!, { target: { value: 'Toronto' } })
  fireEvent.change(screen.getByPlaceholderText('Place or venue name'), { target: { value: 'Trinity Bellwoods Park' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post event' }))
  await screen.findByRole('heading', { name: 'Saved event created-event' })
  expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
    startsAt: new Date(dateTimeFields[0]!.value).toISOString(),
    endsAt: undefined,
  }))
})

it('shows a server save error and leaves the edited form available to retry', async () => {
  api.update.mockRejectedValue(new Error('You do not have permission to manage this event'))
  mount(true)
  await screen.findByDisplayValue(event.title)
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'You do not have permission to manage this event')
  expect(screen.queryByRole('heading', { name: /Saved event/ })).toBeNull()
  expect(screen.getByDisplayValue(event.title)).toBeTruthy()
})

it('requires explicit confirmation before cancelling and then shows the saved cancellation', async () => {
  mount(false)
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel event' }))
  expect(api.cancel).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  await waitFor(() => expect(api.cancel).toHaveBeenCalledWith('night-market', 'dev:demo-mina'))
  await screen.findByText('This event has been cancelled.')
  expect(screen.queryByRole('button', { name: 'Cancel event' })).toBeNull()
})

it('saves notification eligibility when a user marks interest and withdraws it on a second click', async () => {
  window.localStorage.setItem('event-buddy-demo-user', 'cathy')
  mount(false)
  fireEvent.click(await screen.findByRole('button', { name: 'Interested' }))
  await waitFor(() => expect(api.participate).toHaveBeenCalledWith('night-market', 'interested', 'dev:demo-cathy'))
  await screen.findByText("Marked as interested.")
  fireEvent.click(screen.getByRole('button', { name: 'Interested' }))
  await waitFor(() => expect(api.participate).toHaveBeenLastCalledWith('night-market', 'withdrawn', 'dev:demo-cathy'))
  await screen.findByText('Your RSVP was cleared.')
})
