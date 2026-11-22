import pg from 'pg'
import { MemoryChatStore } from './store.js'

interface SeedMessage {
  id: string
  event_id: string
  sender_user_id: string
  display_name: string
  body: string
  created_at: Date
}

// PostgreSQL fixtures supply demo history. Membership and delivery permissions
// are still derived from the current event and RSVPs by EventChatAccess.
export async function loadDemoEventHistory(databaseUrl: string, demoMode: boolean) {
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3_000 })
  try {
    const store = new MemoryChatStore()
    const result = await pool.query<SeedMessage>(`
      SELECT m.id::text, c.event_id::text, m.sender_user_id, u.display_name, m.body, m.created_at
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN app_users u ON u.firebase_uid = m.sender_user_id
      WHERE c.kind = 'event' AND left(m.sender_user_id, 5) = 'demo-'
      ORDER BY m.created_at, m.id`)
    for (const row of result.rows) {
      const conversationId = 'event-' + row.event_id
      const messages = store.messages.get(conversationId) ?? []
      messages.push({
        id: 'seed-' + row.id,
        conversationId,
        senderUserId: demoMode ? row.sender_user_id.slice(5) : row.sender_user_id,
        senderDisplayName: row.display_name,
        body: row.body,
        createdAt: row.created_at.toISOString(),
      })
      store.messages.set(conversationId, messages)
    }
    return store
  } finally {
    await pool.end()
  }
}
