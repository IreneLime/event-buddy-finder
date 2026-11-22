import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { EventSummary } from '@event-buddy/contracts'
import { AuthProvider } from '../src/state/auth-store'
import { EventStoreProvider } from '../src/state/event-store'
import { EventFormPage } from '../src/pages/event-form-page'
import { EventDetailPage } from '../src/pages/event-detail-page'

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), cancel: vi.fn(), participate: vi.fn() }))
vi.mock('../src/lib/backend-api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/backend-api')>(),
  eventsApiUrl: 'http://localhost:4001',
  eventApi: {
    ...api,
    save: (body: unknown, _token: string, id: string) => api.update(id, body),
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
