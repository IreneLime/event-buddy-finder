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
  {
    id: 'cathy',
    displayName: 'Cathy Chen',
    email: 'cathy@example.test',
    demoPassword: '123',
    city: 'Toronto',
    affiliation: 'University of Toronto · ECE',
    ageRange: '18_24',
    bio: 'I study electrical and computer engineering in Toronto. On weekends I look for pottery workshops, small concerts, and cafés worth going back to. I usually bring a camera on walks and am happy to meet up early if you’re coming solo.',
    preferredCategories: ['Arts', 'Food', 'Music'],
    hostedEventIds: [],
    attendedEventIds: ['high-park-walk'],
    interestedEventIds: ['flower-market', 'indie-concert'],
    eventHistory: [
      { title: 'Kensington Market Tasting Walk', venue: 'Kensington Market', category: 'Food', date: 'November 2026' },
      { title: 'Acoustic Set and Coffee', venue: 'The Junction', category: 'Music', date: 'November 2026' },
    ],
  },
  {
    id: 'mina',
    displayName: 'Mina Park',
    email: 'mina@example.test',
    demoPassword: '123',
    city: 'Toronto',
    affiliation: 'University of Toronto · Architecture',
    ageRange: '25_34',
    bio: 'I’m an architecture student who likes sketching storefronts and looking up the stories behind old buildings. My ideal Saturday is a neighbourhood market followed by dumplings. I host easy walks with time for coffee and a few detours.',
    preferredCategories: ['Food', 'Community', 'Arts'],
    hostedEventIds: ['night-market', 'lakeside-hangout'],
    attendedEventIds: ['board-game-cafe'],
    interestedEventIds: ['flower-market', 'gallery-evening'],
    eventHistory: [
      { title: 'Kensington Market Tasting Walk', venue: 'Kensington Market', category: 'Food', date: 'November 2026' },
      { title: 'High Park Bird Walk', venue: 'High Park', category: 'Outdoors', date: 'November 2026' },
    ],
  },
  {
    id: 'alex',
    displayName: 'Alex Rivera',
    email: 'alex@example.test',
    demoPassword: '123',
    city: 'Toronto',
    affiliation: 'Toronto Arts Community',
    ageRange: '25_34',
    bio: 'I organize small board game nights in Toronto and enjoy teaching games to people who haven’t played before. I’m also working through a list of local live-music venues. On a quiet weekend, you’ll find me walking in High Park with a coffee.',
    preferredCategories: ['Games', 'Outdoors', 'Music'],
    hostedEventIds: ['board-game-cafe', 'indie-concert'],
    attendedEventIds: ['high-park-walk'],
    interestedEventIds: ['salsa-social', 'lakeside-hangout'],
    eventHistory: [
      { title: 'High Park Bird Walk', venue: 'High Park', category: 'Outdoors', date: 'November 2026' },
      { title: 'Acoustic Set and Coffee', venue: 'The Junction', category: 'Music', date: 'November 2026' },
    ],
  },
  {
    id: 'nadia',
    displayName: 'Nadia Chen',
    email: 'nadia@example.test',
    demoPassword: '123',
    city: 'Markham',
    affiliation: 'Markham Community Arts Council',
    ageRange: '18_24',
    bio: 'I volunteer with community arts events in Markham and take photos of local markets. I like gallery afternoons and dance classes where everyone is learning together. I’m always up for trading tips on nearby makers and workshops.',
    preferredCategories: ['Arts', 'Markets', 'Dance'],
    hostedEventIds: ['flower-market', 'gallery-evening'],
    attendedEventIds: ['lakeside-hangout'],
    interestedEventIds: ['salsa-social', 'high-park-walk'],
    eventHistory: [
      { title: 'Kensington Market Tasting Walk', venue: 'Kensington Market', category: 'Food', date: 'November 2026' },
      { title: 'First Steps Dance Workshop', venue: 'Woodbridge', category: 'Dance', date: 'November 2026' },
    ],
  },
]

export const demoCredentialsHint = 'Use any listed demo email with password 123.'
