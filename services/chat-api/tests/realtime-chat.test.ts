import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { io, type Socket } from 'socket.io-client'
import type { ChatResult, ConversationMessage } from '@event-buddy/contracts'
import { createChatServer } from '../src/app.js'

describe('real-time chat over actual WebSocket connections', { timeout: 10_000 }, () => {
  let server: ReturnType<typeof createChatServer>
  let origin: string
  let sockets: Socket[]

  beforeEach(async () => {
    sockets = []
    server = createChatServer({ devMode: true })
    server.httpServer.listen(0, '127.0.0.1')
    await once(server.httpServer, 'listening')
    origin = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`
  })
  afterEach(async () => {
    for (const socket of sockets) socket.disconnect()
    await server.close()
  })

  async function connect(userId: string) {
    const socket = io(origin, { auth: { demoUserId: userId }, transports: ['websocket'], forceNew: true, reconnection: false })
    sockets.push(socket)
    await once(socket, 'connect', { signal: AbortSignal.timeout(3_000) })
    return socket
  }

  function send(socket: Socket, conversationId: string, body: string) {
    return new Promise<ChatResult<ConversationMessage>>((resolve, reject) => {
      socket.timeout(3_000).emit('message:send', { conversationId, body }, (error: Error | null, result: ChatResult<ConversationMessage>) => error ? reject(error) : resolve(result))
    })
  }

  // Socket.IO preserves packet order on each connection. Waiting for a later
  // packet makes negative-delivery assertions deterministic, without sleeps.
  async function flushDeliveries() {
    await Promise.all(sockets.filter((socket) => socket.connected).map(async (socket) => {
      const delivered = once(socket, 'conversations:changed', { signal: AbortSignal.timeout(3_000) })
      server.io.to(socket.id!).emit('conversations:changed')
      await delivered
    }))
  }

  for (const conversationId of ['chat-night-market', 'mina-dm']) {
    test(`${conversationId}: saves and pushes a message to both users' open tabs without HTTP polling`, async () => {
      const sender = await connect('cathy')
      const recipient = await connect('mina')
      const secondTab = await connect('mina')
      const otherAttendee = await connect('alex')
      const outsider = await connect('nadia')
      const observed = new Map<Socket, ConversationMessage[]>()
      for (const socket of sockets) {
        observed.set(socket, [])
        socket.on('message:created', (message) => observed.get(socket)!.push(message))
      }
      const result = await send(sender, conversationId, 'Where should we meet?')
      assert.equal(result.ok, true)
      if (!result.ok) return
      await flushDeliveries()
      for (const socket of [sender, recipient, secondTab]) assert.deepEqual(observed.get(socket), [result.data])
      assert.equal(observed.get(otherAttendee)!.length, conversationId === 'chat-night-market' ? 1 : 0)
      assert.deepEqual(observed.get(outsider), [])
      assert.deepEqual(server.service.history(conversationId, 'mina').items.at(-1), result.data)
    })
  }

  test('withdrawal on an existing connection blocks sending, storing, and future broadcasts', async () => {
    const cathy = await connect('cathy')
    const mina = await connect('mina')
    const observed: ConversationMessage[] = []
    cathy.on('message:created', (message) => observed.push(message))
    const before = [...server.service.history('chat-night-market', 'mina').items]
    server.service.participate('night-market', 'cathy', 'withdrawn')
    const rejected = await send(cathy, 'chat-night-market', 'Must not be stored')
    assert.equal(rejected.ok, false)
    if (!rejected.ok) assert.equal(rejected.error.code, 'FORBIDDEN')
    assert.deepEqual(server.service.history('chat-night-market', 'mina').items, before)
    assert.equal((await send(mina, 'chat-night-market', 'Current members only')).ok, true)
    await flushDeliveries()
    assert.deepEqual(observed, [])
  })

  test('a disconnected member can read messages sent while away after reconnecting', async () => {
    const cathy = await connect('cathy')
    const mina = await connect('mina')
    cathy.disconnect()
    const result = await send(mina, 'chat-night-market', 'Meet at the main entrance')
    assert.equal(result.ok, true)
    if (!result.ok) return
    const returning = await connect('cathy')
    const response = await fetch(`${origin}/conversations/chat-night-market/messages`, { headers: { 'x-demo-user-id': 'cathy' } })
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).items.at(-1), result.data)
    const next = once(returning, 'message:created', { signal: AbortSignal.timeout(3_000) })
    const live = await send(mina, 'chat-night-market', 'I am here now')
    assert.equal(live.ok, true)
    if (live.ok) assert.deepEqual((await next)[0], live.data)
  })
})
