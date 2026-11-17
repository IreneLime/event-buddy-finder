import { createServer } from 'node:http'
import cors from 'cors'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { Server } from 'socket.io'
import type { ChatClientEvents, ChatServerEvents, ConversationMessage } from '@event-buddy/contracts'
import { ChatService } from './chat-service.js'
import { demoIdentity, type VerifyIdentity } from './auth.js'
import { errorBody, HttpError } from './errors.js'
import { createDemoStore } from './seed.js'
import type { NotificationStore } from './notifications.js'
import { MemoryChatStore } from './store.js'
import { EventChatAccess, type EventMembershipSource } from './event-membership.js'

interface ServerOptions {
  devMode?: boolean
  webOrigin?: string
  store?: MemoryChatStore
  verifyIdentity?: VerifyIdentity
  notifications?: NotificationStore
  eventMembership?: EventMembershipSource
}

export function createChatServer(options: ServerOptions = {}) {
  if (!options.devMode && !options.verifyIdentity) throw new Error('Firebase identity verification is not configured. Use CHAT_DEV_MODE=true only for local development.')
  if (!options.devMode && !options.eventMembership) throw new Error('Authoritative event membership is not configured.')
  const service = new ChatService(options.store ?? (options.eventMembership ? new MemoryChatStore() : createDemoStore()))
  const access = new EventChatAccess(service, options.eventMembership)
  const verify = options.verifyIdentity ?? demoIdentity
  const origin = options.webOrigin ?? 'http://localhost:5173'
  const app = express()
  const httpServer = createServer(app)
  const io = new Server<ChatClientEvents, ChatServerEvents>(httpServer, { cors: { origin }, maxHttpBufferSize: 16_384 })
  const room = (userId: string) => `user:${userId}`
  const changed = (userIds: Iterable<string>) => {
    for (const userId of new Set(userIds)) io.to(room(userId)).emit('conversations:changed')
  }
  const sendMessage = async (id: string, sender: string, body: unknown): Promise<ConversationMessage> => {
    await access.conversation(id, sender)
    const recipients = await access.recipients(id)
    if (!recipients.includes(sender)) throw new HttpError(403, 'FORBIDDEN', 'Join this event before accessing its chat.')
    // Complete all authority reads before storing the message. A failed lookup
    // must not save a message and then return an error that encourages a retry.
    const message = service.send(id, sender, body)
    for (const userId of recipients) {
      io.to(room(userId)).emit('message:created', message)
    }
    return message
  }

  app.use(cors({ origin }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/health', (_request, response) => response.json({ service: 'chat-api', status: 'ok', storage: 'memory', membership: options.eventMembership ? 'events-postgresql' : 'demo-memory', notifications: options.notifications ? 'postgresql' : 'memory', auth: options.devMode ? 'development' : 'external' }))
  app.use(async (request, response, next) => {
    try {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      const userId = await verify({ token, demoUserId: options.devMode ? request.get('x-demo-user-id') : undefined })
      await access.user(userId)
      response.locals.userId = userId
      next()
    } catch (error) { next(error) }
  })
  const developmentOnly: RequestHandler = (_request, _response, next) => {
    if (!options.devMode) return next(new HttpError(501, 'EVENT_INTEGRATION_REQUIRED', 'Wire event lifecycle operations to the trusted events service.'))
    next()
  }

  app.get('/ListGroupChats', async (_request, response) => response.json({ items: await access.list(response.locals.userId) }))
  app.get('/GetGroupChat/:id', async (request, response) => {
    await access.conversation(request.params.id, response.locals.userId)
    response.json(service.GetGroupChat(request.params.id, response.locals.userId))
  })
  app.get('/conversations/:id/members', async (request, response) => {
    await access.conversation(request.params.id, response.locals.userId)
    response.json({ items: service.GetGroupChat(request.params.id, response.locals.userId).members })
  })
  app.get('/conversations/:id/messages', async (request, response) => {
    const { limit, before } = request.query
    if ((limit !== undefined && typeof limit !== 'string') || (before !== undefined && typeof before !== 'string')) throw new HttpError(400, 'INVALID_INPUT', 'Invalid message pagination parameters.')
    await access.conversation(request.params.id, response.locals.userId)
    response.json(service.history(request.params.id, response.locals.userId, limit === undefined ? 50 : Number(limit), before))
  })
  app.post('/conversations/:id/messages', async (request, response) => {
    const message = await sendMessage(request.params.id, response.locals.userId, request.body?.body)
    response.status(201).json(message)
  })
  app.post('/conversations/direct', async (request, response) => {
    const target = request.body?.userId
    if (typeof target !== 'string' || !target.trim()) throw new HttpError(400, 'INVALID_INPUT', 'Choose another user to message.')
    await access.user(target)
    await access.canStartDirect(response.locals.userId, target)
    const conversation = service.direct(response.locals.userId, request.body?.userId)
    changed(conversation.members.map((member) => member.userId))
    response.status(201).json(conversation)
  })
  app.delete('/DeleteGroupChat/:id', (request, response) => {
    if (options.eventMembership) throw new HttpError(409, 'USE_EVENTS_API', 'Manage the event through the events API; its chat follows the event.')
    changed(service.DeleteGroupChat(request.params.id, response.locals.userId))
    response.sendStatus(204)
  })
  app.get('/events/:eventId/conversation', async (request, response) => {
    const chat = await access.event(request.params.eventId)
    response.json(service.GetGroupChat(chat.id, response.locals.userId))
  })
  app.post('/events/:eventId/conversation/membership', async (request, response) => {
    const conversation = options.eventMembership
      ? service.GetGroupChat((await access.event(request.params.eventId)).id, response.locals.userId)
      : service.join(request.params.eventId, response.locals.userId)
    changed(conversation.members.map((member) => member.userId))
    response.json(conversation)
  })

  // In integrated mode this only resolves an existing event's chat. It never
  // invents an event or writes an independent RSVP/membership record.
  app.post('/CreateGroupChat', developmentOnly, async (request, response) => {
    if (options.eventMembership) {
      const existing = await access.event(request.body?.eventId)
      if (existing.ownerUserId !== response.locals.userId) throw new HttpError(403, 'FORBIDDEN', 'Only the event organizer can create its chat.')
      response.status(201).json(service.GetGroupChat(existing.id, response.locals.userId))
      return
    }
    const conversation = service.CreateGroupChat(request.body?.eventId, request.body?.title, response.locals.userId)
    changed(conversation.members.map((member) => member.userId))
    response.status(201).json(conversation)
  })
  app.patch('/UpdateGroupChat/:id', (request, response) => {
    if (options.eventMembership) throw new HttpError(409, 'USE_EVENTS_API', 'Update your RSVP or the event through the events API.')
    if (options.notifications && request.body?.status === undefined) throw new HttpError(409, 'USE_EVENTS_API', 'Edit or cancel the event through the events API to notify its attendees.')
    const existing = service.store.conversations.get(request.params.id)
    const before = [...(existing?.memberIds ?? [])]
    const result = service.UpdateGroupChat(request.params.id, response.locals.userId, request.body ?? {})
    changed([...before, ...(existing?.memberIds ?? [])])
    for (const { userId, notification } of result.deliveries) io.to(room(userId)).emit('notification:created', notification)
    const { deliveries: _deliveries, ...data } = result
    response.json(data)
  })
  app.get('/me/notifications', async (request, response) => {
    if (request.query.before !== undefined && typeof request.query.before !== 'string') throw new HttpError(400, 'INVALID_CURSOR', 'Invalid notification cursor.')
    if (options.notifications) { response.json(await options.notifications.list(response.locals.userId, request.query.before)); return }
    const items = service.inbox(response.locals.userId)
    response.json({ items, unreadCount: items.filter((notification) => !notification.readAt).length })
  })
  app.patch('/me/notifications/read-all', async (_request, response) => {
    if (options.notifications) await options.notifications.readAll(response.locals.userId)
    else for (const item of service.inbox(response.locals.userId)) service.readNotification(item.id, response.locals.userId)
    io.to(room(response.locals.userId)).emit('notifications:changed')
    response.sendStatus(204)
  })
  app.patch('/me/notifications/:id/read', async (request, response) => {
    const notification = options.notifications ? await options.notifications.read(response.locals.userId, request.params.id) : service.readNotification(request.params.id, response.locals.userId)
    io.to(room(response.locals.userId)).emit('notifications:changed')
    response.json(notification)
  })
  app.use((_request, _response, next) => next(new HttpError(404, 'NOT_FOUND', 'API route not found.')))
  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ code: 'INVALID_JSON', message: 'Request body must be valid JSON.' })
      return
    }
    if (error?.type === 'entity.too.large') {
      response.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' })
      return
    }
    if (!(error instanceof HttpError)) console.error(error)
    response.status(error instanceof HttpError ? error.status : 500).json(errorBody(error))
  }
  app.use(handleError)

  io.use(async (socket, next) => {
    try {
      const userId = await verify({ token: socket.handshake.auth.token, demoUserId: options.devMode ? socket.handshake.auth.demoUserId : undefined })
      await access.user(userId)
      socket.data.userId = userId
      next()
    } catch { next(new Error('Please sign in with a valid user.')) }
  })
  io.on('connection', (socket) => {
    socket.join(room(socket.data.userId))
    socket.on('message:send', async (request, ack) => {
      if (typeof ack !== 'function') return
      try {
        if (typeof request?.conversationId !== 'string') throw new HttpError(400, 'INVALID_INPUT', 'A conversation ID is required.')
        const message = await sendMessage(request.conversationId, socket.data.userId, request?.body)
        ack({ ok: true, data: message })
      } catch (error) { ack({ ok: false, error: errorBody(error) }) }
    })
  })
  options.notifications?.subscribe?.((userId, notification) => {
    io.to(room(userId)).emit('notification:created', notification)
    const event = service.store.events.get(notification.eventId)
    if (event && notification.eventTitle) {
      event.title = notification.eventTitle
      for (const conversation of service.store.conversations.values()) {
        if (conversation.eventId === notification.eventId) conversation.title = notification.eventTitle
      }
      changed(event.participations.keys())
    }
  })
  const close = async () => {
    await options.notifications?.close?.()
    await new Promise<void>((resolve) => io.close(() => resolve()))
    await options.eventMembership?.close?.()
  }
  return { app, httpServer, io, service, close }
}
