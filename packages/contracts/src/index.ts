export type EventStatus = 'scheduled' | 'cancelled'

export type ParticipationStatus = 'interested' | 'pending_approval' | 'going' | 'declined' | 'withdrawn'

export type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_plus'

export type EventSortBy = 'startsAt' | 'createdAt' | 'title'

export type SortOrder = 'asc' | 'desc'

export type MeEventsRole = 'hosted' | 'attending'

export interface EventSummary {
  id: string
  title: string
  description: string
  notes?: string
  startsAt: string
  endsAt?: string
  locationName: string
  /** City used to filter and group event discovery results. */
  city?: string
  address?: string
  latitude?: number
  longitude?: number
  categoryNames: string[]
  imageUrl?: string
  priceAmount?: number
  capacity?: number
  status: EventStatus
  organizerName: string
  organizerUserId?: string
  participantCount: number
  viewerParticipation?: ParticipationStatus
}

export interface CreateEventRequest {
  title: string
  description: string
  notes?: string
  city?: string
  startsAt: string
  endsAt?: string
  locationName: string
  address?: string
  latitude?: number
  longitude?: number
  priceAmount?: number
  capacity?: number
  categoryNames: string[]
  organizingGroupId?: string
  imageObjectKey?: string
}

export interface UpdateEventRequest {
  title?: string
  description?: string
  notes?: string | null
  city?: string
  startsAt?: string
  endsAt?: string | null
  locationName?: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  priceAmount?: number | null
  capacity?: number | null
  categoryNames?: string[]
  organizingGroupId?: string | null
  imageObjectKey?: string | null
}

export interface EventListQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  startDate?: string
  endDate?: string
  location?: string
  status?: EventStatus
  sortBy?: EventSortBy
  order?: SortOrder
}

export interface PaginatedEvents {
  items: EventSummary[]
  page: number
  limit: number
  total: number
}

export interface SetParticipationRequest {
  status: ParticipationStatus
}

export interface EventParticipant {
  userId: string
  displayName: string
  status: ParticipationStatus
  profileImageUrl?: string
}

export interface EventParticipantsResponse {
  eventId: string
  total: number
  items: EventParticipant[]
}

export interface MeEventsQuery {
  role?: MeEventsRole
  status?: ParticipationStatus
  page?: number
  limit?: number
}

export interface UserProfile {
  id: string
  displayName: string
  affiliation?: string
  ageRange?: AgeRange
  bio?: string
  profileImageUrl?: string
  preferredCategories: string[]
}

export interface CurrentUserProfile extends UserProfile {
  email: string
  profileCompleted: boolean
}

export interface CreateProfileRequest {
  displayName: string
  affiliation?: string | null
  ageRange?: AgeRange | null
  bio?: string | null
  preferredCategories?: string[]
}

export interface UpdateProfileRequest {
  displayName?: string
  affiliation?: string | null
  ageRange?: AgeRange | null
  bio?: string | null
  preferredCategories?: string[]
}

export interface ProfileValidationResponse {
  valid: true
  profile: CreateProfileRequest & { preferredCategories: string[] }
}

export interface UserEventHistoryResponse {
  items: EventSummary[]
  page: number
  limit: number
  total: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderUserId: string
  body: string
  createdAt: string
}

export interface NotificationItem {
  id: string
  kind: 'event_updated' | 'event_cancelled'
  eventId: string
  eventTitle?: string
  message: string
  createdAt: string
  readAt?: string
}

export interface NotificationPage {
  items: NotificationItem[]
  unreadCount: number
  nextCursor?: string
}

export interface ImageResponse {
  imageUrl: string
}

export interface ChatMember {
  userId: string
  displayName: string
}

export interface ConversationMessage extends ChatMessage {
  senderDisplayName: string
}

export interface ConversationSummary {
  id: string
  kind: 'event' | 'direct'
  title: string
  eventId?: string
  memberCount: number
  lastMessage?: ConversationMessage
  createdAt: string
}

export interface MessagePage {
  items: ConversationMessage[]
  nextCursor?: string
}

export interface ConversationDetail extends ConversationSummary {
  members: ChatMember[]
  messages: MessagePage
}

export interface CreateGroupChatRequest { eventId: string; title: string }
export interface UpdateGroupChatEventRequest {
  title: string
  kind: NotificationItem['kind']
}
export type UpdateGroupChatRequest = SetParticipationRequest | UpdateGroupChatEventRequest
export interface UpdateGroupChatResponse {
  conversationId: string
  status?: ParticipationStatus
  conversation?: ConversationDetail
}
export interface SendMessageRequest { conversationId: string; body: string }
export interface ApiError { code: string; message: string }
export type ChatResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

// Shared by Socket.IO server and client. Authentication travels in handshake.auth.
export interface ChatServerEvents {
  'message:created': (message: ConversationMessage) => void
  'conversations:changed': () => void
  'notification:created': (notification: NotificationItem) => void
  'notifications:changed': () => void
}

export interface ChatClientEvents {
  'message:send': (request: SendMessageRequest, ack: (result: ChatResult<ConversationMessage>) => void) => void
}
