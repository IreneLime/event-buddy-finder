import type { EventSummary } from '@event-buddy/contracts'

export const starterEvents: EventSummary[] = [
  {
    id: 'night-market',
    title: 'Lanterns & Late Bites',
    description: 'Wander through the market, try something new, and meet the neighbourhood one snack at a time.',
    startsAt: '2026-11-15T18:30:00-05:00',
    endsAt: '2026-11-15T21:30:00-05:00',
    locationName: 'Stackt Market',
    address: '28 Bathurst St, Toronto',
    categoryNames: ['Food', 'Community'],
    priceAmount: 0,
    status: 'scheduled',
    organizerName: 'Mina Park',
    participantCount: 12,
    viewerParticipation: 'interested',
  },
  {
    id: 'clay-club',
    title: 'Sunday Clay Club',
    description: 'A relaxed beginner-friendly pottery session. Make a small cup, get a little messy, and enjoy good company.',
    startsAt: '2026-11-16T13:00:00-05:00',
    endsAt: '2026-11-16T15:00:00-05:00',
    locationName: 'The Workroom',
    address: 'Workshop space · Dundas West',
    categoryNames: ['Arts', 'Creative'],
    priceAmount: 18,
    capacity: 16,
    status: 'scheduled',
    organizerName: 'Clay Club Toronto',
    participantCount: 8,
  },
  {
    id: 'high-park-walk',
    title: 'A Slow Walk Through High Park',
    description: 'A gentle weekend walk, coffee after, and no pressure to keep up with anyone.',
    startsAt: '2026-11-22T10:00:00-05:00',
    endsAt: '2026-11-22T12:00:00-05:00',
    locationName: 'High Park',
    address: 'Meet at the Bloor entrance',
    categoryNames: ['Outdoors', 'Wellness'],
    priceAmount: 0,
    status: 'scheduled',
    organizerName: 'Toronto Slow Club',
    participantCount: 21,
    viewerParticipation: 'going',
  },
  {
    id: 'board-game-cafe',
    title: 'Board Games & New Friends',
    description: 'Pick a game from the shelf or bring a favourite. We will make sure nobody gets left without a team.',
    startsAt: '2026-11-23T17:00:00-05:00',
    endsAt: '2026-11-23T20:00:00-05:00',
    locationName: 'Snakes & Lattes Annex',
    address: '600 Bloor St W, Toronto',
    categoryNames: ['Games', 'Social'],
    priceAmount: 8,
    status: 'scheduled',
    organizerName: 'Alex Rivera',
    participantCount: 6,
  },
  {
    id: 'gallery-evening',
    title: 'First Thursday Gallery Hop',
    description: 'Explore a few small galleries at an easy pace, then find a cozy spot nearby for a drink.',
    startsAt: '2026-11-27T18:00:00-05:00',
    endsAt: '2026-11-27T20:30:00-05:00',
    locationName: 'Ossington Arts District',
    address: 'Meet outside the first gallery',
    categoryNames: ['Arts', 'Culture'],
    priceAmount: 0,
    status: 'scheduled',
    organizerName: 'Nadia Chen',
    participantCount: 14,
  },
  {
    id: 'run-club',
    title: 'Easy Pace Run Club',
    description: 'A welcoming 3 km loop for all paces. We finish with a stretch and a coffee nearby.',
    startsAt: '2026-11-29T09:00:00-05:00',
    endsAt: '2026-11-29T10:30:00-05:00',
    locationName: 'Trinity Bellwoods Park',
    address: 'Meet by the north gate',
    categoryNames: ['Outdoors', 'Wellness'],
    priceAmount: 0,
    status: 'scheduled',
    organizerName: 'Easy Pace Toronto',
    participantCount: 17,
  },
]

export const eventCategories = ['All events', 'Arts', 'Community', 'Food', 'Games', 'Outdoors', 'Wellness']

export function getEventArtwork(categories: string[]): string {
  const category = categories[0]?.toLowerCase()
  if (category === 'food') return 'event-art-food'
  if (category === 'arts' || category === 'creative' || category === 'culture') return 'event-art-arts'
  if (category === 'outdoors' || category === 'wellness') return 'event-art-outdoors'
  if (category === 'games') return 'event-art-games'
  return 'event-art-community'
}

export function getEventEmoji(categories: string[]): string {
  const category = categories[0]?.toLowerCase()
  if (category === 'food') return '🥟'
  if (category === 'arts' || category === 'creative' || category === 'culture') return '🎨'
  if (category === 'outdoors' || category === 'wellness') return '🌿'
  if (category === 'games') return '🎲'
  return '✨'
}
