export type EventStatus = 'scheduled' | 'cancelled'

export type ParticipationStatus = 'interested' | 'going' | 'withdrawn'

export interface EventSummary {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt?: string
  locationName: string
  address?: string
  categoryNames: string[]
  imageUrl?: string
  priceAmount?: number
  capacity?: number
  status: EventStatus
  organizerName: string
  participantCount: number
  viewerParticipation?: ParticipationStatus
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
