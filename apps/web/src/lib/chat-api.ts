import { io, type Socket } from 'socket.io-client'
import type {
  ApiError, ChatClientEvents, ChatServerEvents, ConversationDetail, ConversationMessage,
  ConversationSummary, CreateGroupChatRequest, MessagePage, NotificationItem, NotificationPage,
  UpdateGroupChatRequest, UpdateGroupChatResponse,
} from '@event-buddy/contracts'
import { apiIdentity } from './api-identity'

const origin = (import.meta.env.VITE_CHAT_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4002' : window.location.origin)).replace(/\/$/, '')

async function identity(userId: string | undefined) {
  if (!userId) throw new Error('Please sign in to use chat.')
  return apiIdentity(userId)
}

const eventPath = (id: string) => `/events/${encodeURIComponent(id)}`
const conversationPath = (id: string) => `/conversations/${encodeURIComponent(id)}`

export function createChatApi(userId: string | undefined) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const { token, demoUserId } = await identity(userId)
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(demoUserId ? { 'x-demo-user-id': demoUserId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ message: 'The chat service is unavailable.' }))
      throw new Error(error.message ?? 'The request failed.')
    }
    return response.status === 204 ? undefined as T : response.json()
  }

  return {
    ListGroupChats: () => request<{ items: ConversationSummary[] }>('/ListGroupChats'),
    GetGroupChat: (id: string) => request<ConversationDetail>(`/GetGroupChat/${encodeURIComponent(id)}`),
    messages: (id: string, before: string) => request<MessagePage>(`${conversationPath(id)}/messages?before=${encodeURIComponent(before)}`),
    CreateGroupChat: (body: CreateGroupChatRequest) => request<ConversationDetail>('/CreateGroupChat', 'POST', body),
    eventConversation: (id: string) => request<ConversationDetail>(`${eventPath(id)}/conversation`),
    joinEvent: (id: string) => request<ConversationDetail>(`${eventPath(id)}/conversation/membership`, 'POST'),
    UpdateGroupChat: (id: string, body: UpdateGroupChatRequest) => request<UpdateGroupChatResponse>(`/UpdateGroupChat/${encodeURIComponent(id)}`, 'PATCH', body),
    direct: (userId: string) => request<ConversationDetail>('/conversations/direct', 'POST', { userId }),
    DeleteGroupChat: (id: string) => request<void>(`/DeleteGroupChat/${encodeURIComponent(id)}`, 'DELETE'),
    notifications: (before?: string) => request<NotificationPage>(`/me/notifications${before ? `?before=${encodeURIComponent(before)}` : ''}`),
    readNotification: (id: string) => request<NotificationItem>(`/me/notifications/${encodeURIComponent(id)}/read`, 'PATCH'),
    readAllNotifications: () => request<void>('/me/notifications/read-all', 'PATCH'),
  }
}

export type ChatApi = ReturnType<typeof createChatApi>
export type ChatSocket = Socket<ChatServerEvents, ChatClientEvents>

export function createChatSocket(userId: string | undefined): ChatSocket {
  return io(origin, { autoConnect: false, forceNew: true, auth: (callback) => {
    identity(userId).then(callback).catch(() => callback({}))
  } })
}

export function sendChatMessage(socket: ChatSocket, conversationId: string, body: string): Promise<ConversationMessage> {
  if (!socket.connected) return Promise.reject(new Error('Chat is reconnecting. Please try again when connected.'))
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit('message:send', { conversationId, body }, (error, result) => {
      if (error) reject(new Error('Delivery could not be confirmed. Check the conversation before retrying.'))
      else if (result.ok) resolve(result.data)
      else reject(new Error(result.error.message))
    })
  })
}

export function chatError(error: unknown) {
  return error instanceof TypeError
    ? import.meta.env.DEV
      ? 'Cannot reach chat. Start the chat service with pnpm dev:chat, then retry.'
      : 'Cannot reach chat. Please check your connection and try again.'
    : error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
