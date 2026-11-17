import { MemoryChatStore } from './store.js'

export function createDemoStore() {
  const store = new MemoryChatStore()
  for (const [userId, displayName] of [['cathy', 'Cathy Chen'], ['mina', 'Mina Park'], ['alex', 'Alex Rivera'], ['clay-club', 'Clay Club Toronto'], ['nadia', 'Nadia Chen'], ['slow-club', 'Toronto Slow Club'], ['run-club', 'Easy Pace Toronto']]) {
    store.users.set(userId, { userId, displayName })
  }
  const events = [
    ['night-market', 'Lanterns & Late Bites', 'mina'],
    ['clay-club', 'Sunday Clay Club', 'clay-club'],
    ['high-park-walk', 'A Slow Walk Through High Park', 'slow-club'],
    ['board-game-cafe', 'Board Games & New Friends', 'alex'],
    ['gallery-evening', 'First Thursday Gallery Hop', 'nadia'],
    ['run-club', 'Easy Pace Run Club', 'run-club'],
  ]
  for (const [id, title, ownerUserId] of events) {
    const participations = new Map<string, 'going' | 'interested'>([[ownerUserId, 'going']])
    if (id === 'night-market') { participations.set('cathy', 'interested'); participations.set('alex', 'interested') }
    if (id === 'high-park-walk') participations.set('cathy', 'going')
    store.events.set(id, { id, title, ownerUserId, participations })
    const conversationId = `chat-${id}`
    store.conversations.set(conversationId, { id: conversationId, kind: 'event', eventId: id, title, ownerUserId, memberIds: new Set(participations.keys()), createdAt: '2026-11-10T18:00:00Z' })
    store.messages.set(conversationId, [])
  }
  store.messages.set('chat-night-market', [{ id: 'welcome-night-market', conversationId: 'chat-night-market', senderUserId: 'mina', senderDisplayName: 'Mina Park', body: 'Hey everyone! I’ll be by the main entrance. What would you like to try?', createdAt: '2026-11-10T18:01:00Z' }])
  store.conversations.set('mina-dm', { id: 'mina-dm', kind: 'direct', title: 'Direct message', ownerUserId: 'cathy', memberIds: new Set(['cathy', 'mina']), createdAt: '2026-11-10T18:02:00Z' })
  store.messages.set('mina-dm', [{ id: 'welcome-mina', conversationId: 'mina-dm', senderUserId: 'mina', senderDisplayName: 'Mina Park', body: 'See you at the market!', createdAt: '2026-11-10T18:03:00Z' }])
  return store
}
