export interface DemoConversation {
  id: string
  eventId?: string
  name: string
  kind: 'Event chat' | 'Direct message'
  last: string
  time: string
  unread: number
  people: number
  avatar: string
  memberNames: string[]
}

export interface DemoMessage {
  id: number
  sender: string
  body: string
  time: string
  mine?: boolean
}

// Seed content is fictional and exists only to make the frontend prototype usable.
export const demoConversations: DemoConversation[] = [
  { id: 'night-market', eventId: 'night-market', name: 'Lanterns & Late Bites', kind: 'Event chat', last: 'Mina: I’ll be by the main entrance!', time: '2m', unread: 2, people: 12, avatar: 'Mina Park', memberNames: ['Mina Park', 'Alex Rivera', 'Cathy Chen'] },
  { id: 'flower-market', eventId: 'flower-market', name: 'Saturday Flower Market', kind: 'Event chat', last: 'Nadia: The tulip stalls open at 10.', time: '18m', unread: 1, people: 7, avatar: 'Nadia Chen', memberNames: ['Nadia Chen', 'Cathy Chen', 'Mina Park'] },
  { id: 'clay-club', eventId: 'clay-club', name: 'Sunday Clay Club', kind: 'Event chat', last: 'You: This is my first time too :)', time: '1h', unread: 0, people: 8, avatar: 'Clay Club', memberNames: ['Cathy Chen', 'Mina Park', 'Alex Rivera'] },
  { id: 'mina-dm', name: 'Mina Park', kind: 'Direct message', last: 'That sounds perfect, see you there!', time: 'Yesterday', unread: 0, people: 0, avatar: 'Mina Park', memberNames: ['Cathy Chen', 'Mina Park'] },
  { id: 'dm-alex', name: 'Alex Rivera', kind: 'Direct message', last: 'I’ll save you a seat at the game table.', time: 'Tue', unread: 0, people: 0, avatar: 'Alex Rivera', memberNames: ['Cathy Chen', 'Alex Rivera'] },
  { id: 'dm-nadia', name: 'Nadia Chen', kind: 'Direct message', last: 'The market has a great little coffee cart.', time: 'Mon', unread: 0, people: 0, avatar: 'Nadia Chen', memberNames: ['Cathy Chen', 'Nadia Chen'] },
  { id: 'high-park-walk', eventId: 'high-park-walk', name: 'A Slow Walk Through High Park', kind: 'Event chat', last: 'Alex: Weather looks great for Sunday', time: 'Yesterday', unread: 0, people: 21, avatar: 'Alex Rivera', memberNames: ['Alex Rivera', 'Cathy Chen', 'Nadia Chen'] },
]

export const demoMessagesByConversation: Record<string, DemoMessage[]> = {
  'night-market': [
    { id: 1, sender: 'Mina Park', body: 'Hey everyone! So happy you’re joining. I’ll be by the main entrance at 6:20.', time: '6:42 PM' },
    { id: 2, sender: 'Alex Rivera', body: 'I’ve been meaning to check Stackt Market out for ages. Any stall recommendations?', time: '6:44 PM' },
    { id: 3, sender: 'Cathy Chen', body: 'Same here! I’d love to try the dumplings.', time: '6:48 PM', mine: true },
    { id: 4, sender: 'Mina Park', body: 'The dumplings are great. Text here if you get turned around!', time: '6:52 PM' },
  ],
  'flower-market': [
    { id: 1, sender: 'Nadia Chen', body: 'The tulip stalls at Unionville open around 10. I’ll bring a tote bag.', time: '9:10 AM' },
    { id: 2, sender: 'Cathy Chen', body: 'Perfect. I’ll meet you near the main entrance.', time: '9:18 AM', mine: true },
    { id: 3, sender: 'Mina Park', body: 'I’m taking the bus from downtown. I’ll message when I arrive.', time: '9:24 AM' },
  ],
  'clay-club': [
    { id: 1, sender: 'Mina Park', body: 'The studio provides aprons, so just bring yourself!', time: '2:02 PM' },
    { id: 2, sender: 'Cathy Chen', body: 'This is my first time too. Looking forward to it!', time: '2:07 PM', mine: true },
  ],
  'mina-dm': [
    { id: 1, sender: 'Mina Park', body: 'Want to check out the flower market before the afternoon concert?', time: 'Yesterday' },
    { id: 2, sender: 'Cathy Chen', body: 'That sounds perfect, see you there!', time: 'Yesterday', mine: true },
  ],
  'dm-alex': [
    { id: 1, sender: 'Alex Rivera', body: 'I’ll save you a seat at the game table. Do you have a favourite game?', time: 'Tue' },
    { id: 2, sender: 'Cathy Chen', body: 'I’m happy to learn something new. Maybe something cooperative?', time: 'Tue', mine: true },
  ],
  'dm-nadia': [
    { id: 1, sender: 'Nadia Chen', body: 'The market has a great little coffee cart beside the flower stalls.', time: 'Mon' },
    { id: 2, sender: 'Cathy Chen', body: 'That sounds lovely. I’ll meet you by the entrance.', time: 'Mon', mine: true },
  ],
  'high-park-walk': [
    { id: 1, sender: 'Alex Rivera', body: 'Weather looks great for Sunday. Let’s meet by the Bloor entrance.', time: 'Yesterday' },
    { id: 2, sender: 'Nadia Chen', body: 'I’ll bring coffee in a thermos for the walk.', time: 'Yesterday' },
  ],
}
