import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatServer } from '../../../services/chat-api/src/app'
import { createDemoStore } from '../../../services/chat-api/src/seed'
import type { ChatState } from '../src/state/chat-context'

vi.mock('../src/lib/events-api', async () => {
  const { starterEvents } = await import('../src/data/mock-events')
  return { createEventsApi: () => ({ list: async () => starterEvents }) }
})

const server = createChatServer({ devMode: true })
let auth: typeof import('../src/state/auth-store')
let chat: typeof import('../src/state/chat-store')
let context: typeof import('../src/state/chat-context')
let pages: typeof import('../src/pages/chats-page')
let events: typeof import('../src/state/event-store')
let client: typeof import('../src/lib/chat-api')
let session: ChatState

beforeAll(async () => {
  await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Chat test server did not start')
  vi.stubEnv('VITE_CHAT_API_URL', `http://127.0.0.1:${address.port}`)
  auth = await import('../src/state/auth-store')
  chat = await import('../src/state/chat-store')
  context = await import('../src/state/chat-context')
  pages = await import('../src/pages/chats-page')
  events = await import('../src/state/event-store')
  client = await import('../src/lib/chat-api')
  // jsdom has no scrolling layout; the behavior under test is identity and messages.
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  window.localStorage.clear()
  server.service.store = createDemoStore()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await waitFor(() => expect(connectedUsers()).toEqual([]))
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await new Promise<void>((resolve) => server.io.close(() => resolve()))
})

function connectedUsers() {
  return [...server.io.sockets.sockets.values()].map((socket) => socket.data.userId).sort()
}

function AccountControls() {
  const { signIn, signOut } = auth.useAuth()
  return <>
    {['cathy', 'mina', 'alex', 'nadia'].map((id) => <button key={id} onClick={() => signIn(`${id}@example.test`, 'demo1234')}>Log in as {id}</button>)}
    <button onClick={signOut}>Log out</button>
  </>
}

function SessionProbe() {
  session = context.useChatStore()
  return <button onClick={() => void session.refresh()}>Refresh chat</button>
}

function mountPage(detail = false, conversationId = 'mina-dm') {
  const { AuthProvider } = auth
  const { ChatStoreProvider } = chat
  const { EventStoreProvider } = events
  const { ChatPage, ChatsPage } = pages
  render(<StrictMode><AuthProvider>
    <AccountControls />
    <EventStoreProvider><MemoryRouter initialEntries={[`/chats/${conversationId}`]}>
      <ChatStoreProvider><SessionProbe /><Routes>
        <Route path="/chats/:conversationId" element={detail ? <ChatPage /> : <ChatsPage />} />
      </Routes></ChatStoreProvider>
    </MemoryRouter></EventStoreProvider>
  </AuthProvider></StrictMode>)
}

async function logIn(id: string) {
  fireEvent.click(screen.getByRole('button', { name: `Log in as ${id}` }))
  await waitFor(() => {
    expect(session.userId).toBe(id)
    expect(session.connected).toBe(true)
    expect(session.loading).toBe(false)
    expect(connectedUsers()).toEqual([id])
  })
}

function senderOf(body: string) {
  const bubble = within(screen.getByRole('log', { name: 'Conversation messages' })).getByText(body)
  return within(bubble.parentElement!).getByText(/ · /).textContent
}

async function waitForMessage(body: string) {
  const log = await screen.findByRole('log', { name: 'Conversation messages' })
  return within(log).findByText(body)
}

describe('chat follows the signed-in account', () => {
  for (const conversationId of ['mina-dm', 'chat-night-market']) {
    it(`${conversationId}: renders another user's live messages without reloading history or losing the draft`, async () => {
      mountPage(true, conversationId)
      await logIn('cathy')
      const transcript = await screen.findByRole('log', { name: 'Conversation messages' })
      const composer = screen.getByRole('textbox', { name: 'Write a message' })
      fireEvent.change(composer, { target: { value: 'My unsent plan' } })
      const history = vi.spyOn(session.api, 'GetGroupChat').mockRejectedValue(new Error('Live messages must arrive through the socket'))
      const peer = client.createChatSocket('mina')
      try {
        peer.connect()
        await waitFor(() => expect(peer.connected).toBe(true))
        const unrelatedId = conversationId === 'mina-dm' ? 'chat-night-market' : 'mina-dm'
        await act(async () => { await client.sendChatMessage(peer, unrelatedId, 'A different conversation') })
        let sent!: Awaited<ReturnType<typeof client.sendChatMessage>>
        await act(async () => { sent = await client.sendChatMessage(peer, conversationId, 'Meet me at the entrance') })
        await within(transcript).findByText('Meet me at the entrance')
        expect(within(transcript).queryByText('A different conversation')).toBeNull()
        // Repeat delivery must not render the same message twice.
        await act(async () => {
          const received = new Promise<void>((resolve) => session.socket.once('message:created', () => resolve()))
          server.io.to('user:cathy').emit('message:created', sent)
          await received
        })
        expect(within(transcript).getAllByText(sent.body)).toHaveLength(1)
        expect(history).not.toHaveBeenCalled()
        expect(screen.getByRole('log', { name: 'Conversation messages' })).toBe(transcript)
        expect(screen.getByRole('textbox', { name: 'Write a message' })).toBe(composer)
        expect(composer).toHaveProperty('value', 'My unsent plan')
      } finally { peer.disconnect() }
    })
  }

  it('reloads missed chat history on socket reconnect while keeping the same page open', async () => {
    mountPage(true)
    await logIn('cathy')
    const transcript = await screen.findByRole('log', { name: 'Conversation messages' })
    const socket = session.socket
    await act(async () => { socket.disconnect() })
    await waitFor(() => expect(session.connected).toBe(false))
    const message = server.service.send('mina-dm', 'mina', 'Sent while Cathy was offline')
    expect(within(transcript).queryByText(message.body)).toBeNull()
    await act(async () => { socket.connect() })
    await within(transcript).findByText(message.body)
    expect(session.socket).toBe(socket)
    expect(screen.getByRole('log', { name: 'Conversation messages' })).toBe(transcript)
  })

  it('uses the saved Mina login immediately after a page reload', async () => {
    server.service.send('mina-dm', 'cathy', 'Previously sent by Cathy')
    window.localStorage.setItem('event-buddy-demo-user', 'mina')
    mountPage(true)
    await screen.findByRole('heading', { name: 'Cathy Chen', level: 1 })
    expect(senderOf('Previously sent by Cathy')).toMatch(/^Cathy Chen · /)
    await waitFor(() => expect(connectedUsers()).toEqual(['mina']))
  })

  it('shows Cathy by name for Mina, and sends as Mina after switching accounts', async () => {
    server.service.send('mina-dm', 'cathy', 'A message from Cathy')
    mountPage(true)
    await logIn('cathy')
    await waitForMessage('A message from Cathy')
    expect(senderOf('A message from Cathy')).toMatch(/^You · /)
    const oldSocket = session.socket

    await logIn('mina')
    await screen.findByRole('heading', { name: 'Cathy Chen', level: 1 })
    expect(senderOf('A message from Cathy')).toMatch(/^Cathy Chen · /)
    expect(senderOf('See you at the market!')).toMatch(/^You · /)
    expect(oldSocket.connected).toBe(false)

    fireEvent.change(screen.getByRole('textbox', { name: 'Write a message' }), { target: { value: 'Now speaking as Mina' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(server.service.history('mina-dm', 'mina').items.at(-1)?.senderUserId).toBe('mina'))
    await waitForMessage('Now speaking as Mina')
    expect(senderOf('Now speaking as Mina')).toMatch(/^You · /)

    await logIn('cathy')
    await screen.findByRole('heading', { name: 'Mina Park', level: 1 })
    expect(senderOf('Now speaking as Mina')).toMatch(/^Mina Park · /)
    expect(senderOf('A message from Cathy')).toMatch(/^You · /)
  })

  it('loads each demo account\'s own conversations and notifications', async () => {
    server.service.updateEvent('night-market', 'Updated market', 'event_updated', 'mina')
    mountPage()
    for (const id of ['cathy', 'mina', 'alex', 'nadia']) {
      await logIn(id)
      expect(session.conversations.map((item) => item.id)).toEqual(server.service.ListGroupChats(id).map((item) => item.id))
      expect(session.notifications.map((item) => item.id)).toEqual(server.service.inbox(id).map((item) => item.id))
    }
    expect(session.conversations.map((item) => item.id)).toEqual(['chat-gallery-evening'])
    expect(session.notifications).toEqual([])
    expect(screen.queryByText('Mina Park')).toBeNull()
    expect(screen.getByText('First Thursday Gallery Hop')).toBeTruthy()
  })

  it('keeps multiline drafts on Shift+Enter and IME confirmation, then sends on Enter', async () => {
    mountPage(true)
    await logIn('cathy')
    await screen.findByRole('heading', { name: 'Mina Park', level: 1 })
    const input = screen.getByRole('textbox', { name: 'Write a message' })
    const send = vi.spyOn(client, 'sendChatMessage')
    const body = 'First line\nSecond line'
    fireEvent.change(input, { target: { value: body } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(send).not.toHaveBeenCalled()
    expect(input).toHaveProperty('value', body)
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      const message = server.service.history('mina-dm', 'cathy').items.at(-1)
      expect(message?.body).toBe(body)
      expect(message?.senderUserId).toBe('cathy')
      expect(input).toHaveProperty('value', '')
    })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('ignores an old account\'s delayed response and clears the session on logout', async () => {
    const realFetch = globalThis.fetch
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let delayed = false
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      const response = await realFetch(url, options)
      if (String(url).endsWith('/ListGroupChats') && new Headers(options?.headers).get('x-demo-user-id') === 'cathy') {
        delayed = true
        await gate
      }
      return response
    })
    mountPage()
    fireEvent.click(screen.getByRole('button', { name: 'Log in as cathy' }))
    await waitFor(() => expect(delayed).toBe(true))
    const oldSocket = session.socket
    await logIn('mina')
    await act(async () => { release(); await gate })
    expect(session.userId).toBe('mina')
    expect(session.conversations.map((item) => item.title)).toContain('Cathy Chen')
    expect(session.conversations.map((item) => item.title)).not.toContain('Mina Park')
    expect(oldSocket.connected).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(connectedUsers()).toEqual([]))
    expect(session.userId).toBeUndefined()
    expect(session.conversations).toEqual([])
    expect(session.notifications).toEqual([])
    const requests = fetchSpy.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Refresh chat' }))
    expect(fetchSpy.mock.calls.length).toBe(requests)
    expect(screen.queryByText('Cathy Chen')).toBeNull()
  })

  it('does not fall back to Cathy when no account is signed in', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(client.createChatApi(undefined).ListGroupChats()).rejects.toThrow('Please sign in')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
