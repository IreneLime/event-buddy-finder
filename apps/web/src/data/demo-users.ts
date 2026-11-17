import type { UserProfile } from '@event-buddy/contracts'

export interface DemoUser extends UserProfile {
  email: string
  demoPassword: string
  city: string
  hostedEventIds: string[]
  attendedEventIds: string[]
  interestedEventIds: string[]
  eventHistory: Array<{ title: string; venue: string; category: string; date: string }>
}

// These are fictional sample identities for frontend development only.
export const demoUsers: DemoUser[] = [
  { id: 'cathy', displayName: 'Cathy Chen', email: 'cathy@example.test', demoPassword: 'demo1234', city: 'Toronto', affiliation: 'University of Toronto · ECE', ageRange: '18_24', bio: 'Always up for a new café, live music, or a creative afternoon. Currently learning pottery.', preferredCategories: ['Arts', 'Food', 'Music'], hostedEventIds: [], attendedEventIds: ['high-park-walk'], interestedEventIds: ['night-market', 'clay-club'], eventHistory: [{ title: 'Harbourfront Summer Music Night', venue: 'Harbourfront Centre', category: 'Live music', date: 'August 2026' }, { title: 'Kensington Market Food Walk', venue: 'Kensington Market', category: 'Food', date: 'September 2026' }] },
  { id: 'mina', displayName: 'Mina Park', email: 'mina@example.test', demoPassword: 'demo1234', city: 'Toronto', affiliation: 'University of Toronto · Architecture', ageRange: '25_34', bio: 'Weekend market wanderer and enthusiastic dumpling recommender. Happy to meet new neighbours.', preferredCategories: ['Food', 'Community', 'Arts'], hostedEventIds: ['night-market', 'lakeside-hangout'], attendedEventIds: ['board-game-cafe'], interestedEventIds: ['flower-market', 'clay-club'], eventHistory: [{ title: 'Danforth Night Market', venue: 'Greektown, Toronto', category: 'Food & community', date: 'September 2026' }, { title: 'Beginner Pottery Open Studio', venue: 'The Workroom', category: 'Arts', date: 'October 2026' }] },
  { id: 'alex', displayName: 'Alex Rivera', email: 'alex@example.test', demoPassword: 'demo1234', city: 'Toronto', affiliation: 'Toronto Arts Community', ageRange: '25_34', bio: 'Board games, park walks, and discovering small live-music venues.', preferredCategories: ['Games', 'Outdoors', 'Music'], hostedEventIds: ['board-game-cafe', 'indie-concert'], attendedEventIds: ['high-park-walk'], interestedEventIds: ['salsa-social'], eventHistory: [{ title: 'Indie Discovery Showcase', venue: 'The Danforth Music Hall', category: 'Live music', date: 'October 2026' }, { title: 'Cooperative Games Afternoon', venue: 'Snakes & Lattes Annex', category: 'Games', date: 'September 2026' }] },
  { id: 'nadia', displayName: 'Nadia Chen', email: 'nadia@example.test', demoPassword: 'demo1234', city: 'Markham', affiliation: 'Markham Community Arts Council', ageRange: '18_24', bio: 'I like flower markets, dance workshops, and taking far too many photos.', preferredCategories: ['Arts', 'Community', 'Wellness'], hostedEventIds: ['flower-market'], attendedEventIds: ['gallery-evening'], interestedEventIds: ['high-park-walk'], eventHistory: [{ title: 'Unionville Autumn Makers Market', venue: 'Main Street Unionville', category: 'Art & community', date: 'October 2026' }, { title: 'Salsa for Beginners', venue: 'Downtown Markham', category: 'Dance', date: 'August 2026' }] },
]

export const demoCredentialsHint = 'Use any listed demo email with password demo1234.'
