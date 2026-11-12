export type EventStatus = 'scheduled' | 'cancelled'

export type ParticipationStatus = 'interested' | 'going' | 'withdrawn'

export type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_plus'

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
  message: string
  createdAt: string
  readAt?: string
}
