export type EventStatus = 'scheduled' | 'cancelled'

export type ParticipationStatus = 'interested' | 'going' | 'withdrawn'

export type EventSortBy = 'startsAt' | 'createdAt' | 'title'

export type SortOrder = 'asc' | 'desc'

export type MeEventsRole = 'hosted' | 'attending'

export interface EventSummary {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt?: string
  locationName: string
  address?: string
  latitude?: number
  longitude?: number
  categoryNames: string[]
  imageUrl?: string
  priceAmount?: number
  capacity?: number
  status: EventStatus
  organizerName: string
  participantCount: number
  viewerParticipation?: ParticipationStatus
}

export interface CreateEventRequest {
  title: string
  description: string
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
  ageRange?: 'under_18' | '18_24' | '25_34' | '35_44' | '45_plus'
  bio?: string
  profileImageUrl?: string
  preferredCategories: string[]
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
  message: string
  createdAt: string
  readAt?: string
}
