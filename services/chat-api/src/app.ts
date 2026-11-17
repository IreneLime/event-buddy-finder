import { createServer } from 'node:http'
import cors from 'cors'
import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { Server } from 'socket.io'
import type { ChatClientEvents, ChatServerEvents, ConversationMessage } from '@event-buddy/contracts'
import { ChatService } from './chat-service.js'
import { demoIdentity, type VerifyIdentity } from './auth.js'
import { errorBody, HttpError } from './errors.js'
import { createDemoStore } from './seed.js'
import type { MemoryChatStore } from './store.js'
import type { NotificationStore } from './notifications.js'

interface ServerOptions {
  devMode?: boolean
  webOrigin?: string
  store?: MemoryChatStore
  verifyIdentity?: VerifyIdentity
  notifications?: NotificationStore
}

export function createChatServer(options: ServerOptions = {}) {
  if (!options.devMode && !options.verifyIdentity) throw new Error('Firebase identity verification is not configured. Use CHAT_DEV_MODE=true only for local development.')
  const service = new ChatService(options.store ?? createDemoStore())
  const verify = options.verifyIdentity ?? demoIdentity
  const origin = options.webOrigin ?? 'http://localhost:5173'
  const app = express()
  const httpServer = createServer(app)
  const io = new Server<ChatClientEvents, ChatServerEvents>(httpServer, { cors: { origin }, maxHttpBufferSize: 16_384 })
  const room = (userId: string) => `user:${userId}`
  const changed = (userIds: Iterable<string>) => {
    for (const userId of new Set(userIds)) io.to(room(userId)).emit('conversations:changed')
  }
  const broadcast = (message: ConversationMessage) => {
    for (const userId of service.store.conversations.get(message.conversationId)!.memberIds) {
      io.to(room(userId)).emit('message:created', message)
    }
  }

  app.use(cors({ origin }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/health', (_request, response) => response.json({ service: 'chat-api', status: 'ok', storage: 'memory', notifications: options.notifications ? 'postgresql' : 'memory', auth: options.devMode ? 'development' : 'external' }))
  app.use(async (request, response, next) => {
    try {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      const userId = await verify({ token, demoUserId: options.devMode ? request.get('x-demo-user-id') : undefined })
      service.user(userId)
      response.locals.userId = userId
      next()
    } catch (error) { next(error) }
  })
  const developmentOnly: RequestHandler = (_request, _response, next) => {
    if (!options.devMode) return next(new HttpError(501, 'EVENT_INTEGRATION_REQUIRED', 'Wire event lifecycle operations to the trusted events service.'))
    next()
  }

  app.get('/ListGroupChats', (_request, response) => response.json({ items: service.ListGroupChats(response.locals.userId) }))
  app.get('/GetGroupChat/:id', (request, response) => response.json(service.GetGroupChat(request.params.id, response.locals.userId)))
  app.get('/conversations/:id/members', (request, response) => response.json({ items: service.GetGroupChat(request.params.id, response.locals.userId).members }))
  app.get('/conversations/:id/messages', (request, response) => {
    const { limit, before } = request.query
    if ((limit !== undefined && typeof limit !== 'string') || (before !== undefined && typeof before !== 'string')) throw new HttpError(400, 'INVALID_INPUT', 'Invalid message pagination parameters.')
    response.json(service.history(request.params.id, response.locals.userId, limit === undefined ? 50 : Number(limit), before))
  })
  app.post('/conversations/:id/messages', (request, response) => {
    const message = service.send(request.params.id, response.locals.userId, request.body?.body)
    broadcast(message)
    response.status(201).json(message)
  })
  app.post('/conversations/direct', (request, response) => {
    const conversation = service.direct(response.locals.userId, request.body?.userId)
    changed(conversation.members.map((member) => member.userId))
    response.status(201).json(conversation)
  })
  app.delete('/DeleteGroupChat/:id', (request, response) => {
    changed(service.DeleteGroupChat(request.params.id, response.locals.userId))
    response.sendStatus(204)
  })
  app.get('/events/:eventId/conversation', (request, response) => response.json(service.GetGroupChat(service.eventConversation(request.params.eventId).id, response.locals.userId)))
  app.post('/events/:eventId/conversation/membership', (request, response) => {
    const conversation = service.join(request.params.eventId, response.locals.userId)
    changed(conversation.members.map((member) => member.userId))
    response.json(conversation)
  })

  // Temporary bridge while events-api still exposes only /health. In production
  // Bella's event service must own these operations and invoke the service layer
  // after verifying event ownership/participation, ideally in one SQL transaction.
  app.post('/CreateGroupChat', developmentOnly, (request, response) => {
    const conversation = service.CreateGroupChat(request.body?.eventId, request.body?.title, response.locals.userId)
    changed(conversation.members.map((member) => member.userId))
    response.status(201).json(conversation)
  })
  app.patch('/UpdateGroupChat/:id', (request, response) => {
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
      service.user(userId)
      socket.data.userId = userId
      next()
    } catch { next(new Error('Please sign in with a valid user.')) }
  })
  io.on('connection', (socket) => {
    socket.join(room(socket.data.userId))
    socket.on('message:send', (request, ack) => {
      if (typeof ack !== 'function') return
      try {
        const message = service.send(request?.conversationId, socket.data.userId, request?.body)
        broadcast(message)
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
  }
  return { app, httpServer, io, service, close }
}
