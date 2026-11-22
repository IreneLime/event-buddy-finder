# Chat and Notifications API

Express and Socket.IO chat with event membership read from the authoritative
PostgreSQL records owned by events-api. Chat messages, direct conversations, and
notifications persist in PostgreSQL across service restarts.
The existing Firebase identity/token-provider integration is still required for
production. Demo identity headers are explicitly development-only.

Chat and notification unit, WebSocket, frontend, and PostgreSQL test commands
and requirement coverage are documented in [real-time regression tests](../../docs/realtime-testing.md).

## Run

Set the same `DATABASE_URL` for the events-api and chat-api implementations
now available together on main. Notification delivery
also requires migrations 001–004 described in
[real-time event notifications](../../docs/realtime-event-notifications.md).

```sh
pnpm install
pnpm dev:events
pnpm dev:chat
pnpm dev:web
```

The chat service listens on `127.0.0.1:4002`; `HOST`, `PORT`, and `WEB_ORIGIN`
configure it. The frontend uses `VITE_CHAT_API_URL`. The development command sets
`CHAT_DEV_MODE=true`: a demo ID such as `cathy` maps to the `demo-cathy` database
profile. Other existing database profiles work too; users/events are not limited
to hard-coded chat fixtures. Production uses the verified Firebase UID directly.

## Events API owns chat membership

- Create events through events-api `POST /events`. Every real event resolves to
  a deterministic `event-<database-id>` conversation on lookup/listing. No separate
  CreateGroupChat call or seeded chat is required. An unknown event is rejected.
- RSVP through events-api `PUT /events/:id/participation`. Only `interested` and
  `going` allow access. The creator has implicit access until an explicit RSVP
  overrides it; an explicit creator withdrawal also revokes access.
- Chat reads the same `events`, `event_participations`, and `app_users` rows on
  every history/member read, send, and recipient selection. Stored messages
  never grant event access. Changes
  take effect on the next operation without waiting for a sync job or reconnect.
- After a committed withdrawal, REST reads/writes and already connected Socket.IO
  sends are rejected, and subsequent messages are not delivered to that user.
  Already received messages cannot be retracted from a client.
- Sends and events-api RSVP upserts take the same event-scoped transaction advisory
  lock before checking or changing membership. This covers the organizer's first
  withdrawal even without an existing RSVP row. A withdrawal that locks first
  commits before the waiting send selects its sender and recipients.
- Failed database lookups return 503 and never fall back to cached permissions.
  All authority reads complete before a message is saved or acknowledged.
- Joining/leaving from the frontend also writes through events-api. An RSVP update
  refreshes chat state and invalidates the open chat view. A lookup never silently
  re-enrolls a withdrawn user.
- Restarting chat preserves group/direct conversations, messages, and stable IDs.
  Event chats use `event-<event-id>`; direct chats use `direct-<conversation-id>`.
- Message inserts are committed before Socket.IO
  delivery or acknowledgement. Storage failures return 503 without a memory
  fallback or a message broadcast. Concurrent reverse DM requests reuse one
  two-person conversation through a transaction-scoped ordered-pair lock.
- Event withdrawal revokes access without deleting messages. Current RSVP status
  controls event access; direct participants are stored as a canonical pair on
  the conversation. The removed `conversation_members` table is not used.

## API

All routes except `/health` require a valid identity and database profile.

| Endpoint | Behavior |
| --- | --- |
| `GET /ListGroupChats` | Current user's event chats and direct conversations |
| `GET /events/:eventId/conversation` | Resolve a real event's chat; requires current membership |
| `GET /GetGroupChat/:id` | Conversation, current members, latest 50 messages |
| `GET /conversations/:id/members` | Current member list |
| `GET /conversations/:id/messages?limit=50&before=<id>` | Paginated history; limit 1–100 |
| `POST /conversations/:id/messages` | `{ body }`; same permission checks as Socket.IO |
| `POST /conversations/direct` | `{ userId }`; requires a currently shared event to start a DM |
| `GET /me/notifications?before=<id>` | Saved alerts, unread count, pagination |
| `PATCH /me/notifications/:id/read` | Mark only the caller's notification read |
| `PATCH /me/notifications/read-all` | Mark the caller's inbox read |

In integrated mode the legacy `POST /events/:eventId/conversation/membership`
only resolves an existing membership; it does not change RSVP status.
`PATCH /UpdateGroupChat/:id` and `DELETE /DeleteGroupChat/:id` return
`409 USE_EVENTS_API`. Development-only `POST /CreateGroupChat` resolves a real
owned event and cannot invent one. The standalone `createChatServer({ devMode:
true })` memory fixture remains for isolated tests; the normal startup always
injects `PostgresChats` and `PostgresEventMembership`, including in development.
Production startup requires an identity verifier, an authoritative membership
source, and persistent chat storage. `/health` reports `storage: postgresql`.

No additional migration is required for chat persistence: migrations 001–004
provide the consolidated conversation and message tables used by this adapter.
Existing database-seeded group/direct chats and their messages remain readable.
This adapter is compatible with the six-table consolidation already merged in
#15. See [chat schema integration](../../database/README.md#chat-persistence-and-schema-consolidation).
Messages previously held only in an old server's memory cannot be recovered
after that server has stopped.

Socket.IO `message:send` accepts `{ conversationId, body }` and acknowledges a
saved message or error. The sender comes from the verified socket identity.
`message:created`, `conversations:changed`, `notification:created`, and
`notifications:changed` update the frontend. Message bodies contain 1–2000
non-whitespace characters; request bodies are limited to 16 KB. Read receipts are
not implemented.

For a known chat, the frontend updates `lastMessage` and re-sorts its conversation
list directly from `message:created`, without refetching the chat list or inbox.
Duplicate or older deliveries cannot regress the preview, and an in-flight list
response preserves newer live messages. The server list remains authoritative
for membership: reconnects, RSVP/event changes, `conversations:changed`, and
messages for unknown chats refresh it.

## Socket.IO payload examples

The following example runs against the local development server with an existing
`demo-cathy` profile. Install/use `socket.io-client` in your client project. Resolve
a conversation through `GET /events/:eventId/conversation` or
`POST /conversations/direct` first; `event-7` below is an illustrative ID, not a
guaranteed seed ID. The server identifies the sender from the connection, so do
not put a sender ID in `message:send`.

```js
import { io } from 'socket.io-client'

const socket = io('http://127.0.0.1:4002', {
  auth: { demoUserId: 'cathy' }, // Local CHAT_DEV_MODE only.
})
socket.on('connect', () => {
  socket.timeout(8000).emit('message:send', {
    conversationId: 'event-7',
    body: 'Meet at the main entrance?',
  }, (transportError, result) => {
    if (transportError) { console.error('Acknowledgement timed out'); return }
    if (!result.ok) { console.error(result.error.code, result.error.message); return }
    console.log('Saved message:', result.data)
  })
})
socket.on('message:created', (message) => console.log('New message:', message))
socket.on('notification:created', (notification) => console.log('Event alert:', notification))
socket.on('conversations:changed', () => console.log('Reload conversation membership'))
socket.on('notifications:changed', () => console.log('Reload saved inbox/read state'))
socket.on('connect_error', (error) => console.error(error.message))
```

For Firebase-integrated deployments, use handshake `auth: { token: idToken }`
and REST `Authorization: Bearer <idToken>`, with the server's `verifyIdentity`
configured to verify that token. The supplied standalone startup is local-demo
only; production identity verification must be injected. A client-supplied
`demoUserId` or `x-demo-user-id` is never production authentication.

A successful acknowledgement has this shape. `message:created` carries exactly
the `data` object to the sender's and each eligible recipient's connected tabs,
after the database commit. IDs are strings and times are UTC ISO timestamps.

```json
{
  "ok": true,
  "data": {
    "id": "42",
    "conversationId": "event-7",
    "senderUserId": "cathy",
    "senderDisplayName": "Cathy Chen",
    "body": "Meet at the main entrance?",
    "createdAt": "2026-11-22T03:00:00.000Z"
  }
}
```

A socket rejection wraps the error; for example, sending after withdrawal:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Join this event before accessing its chat."
  }
}
```

REST errors return the inner `{ "code", "message" }` object with an HTTP status.
Socket acknowledgements use `ok: false` rather than an HTTP status.

| HTTP status | Code | Example cause |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | Missing local identity or rejected authentication |
| 403 | `FORBIDDEN` | Withdrawn event participant, unrelated DM recipient, or conversation outsider |
| 400 | `INVALID_INPUT` | Empty body, non-string body, or body longer than 2000 characters after trimming |
| 400 | `INVALID_CURSOR` | Malformed message cursor or cursor from another conversation |
| 404 | `CONVERSATION_NOT_FOUND` | Unknown conversation |
| 503 | `CHAT_STORAGE_UNAVAILABLE` | Database lookup, message insert, or commit failure; failed sends emit no message |

`notification:created` carries a saved inbox item, for example:

```json
{
  "id": "91",
  "kind": "event_updated",
  "eventId": "7",
  "eventTitle": "Neighbourhood Music Night",
  "message": "Neighbourhood Music Night updated its location.",
  "createdAt": "2026-11-22T03:05:00.000Z"
}
```

Cancellation uses `kind: "event_cancelled"` and a message such as
`"Neighbourhood Music Night has been cancelled."`. `eventId` is the public alias
when present, otherwise the database ID string. `readAt` is omitted until read.
Event changes save alerts for interested, pending-approval, and going attendees,
excluding the actor and withdrawn/declined users. The outbox delivers to online
tabs; offline users retrieve the same saved IDs from the inbox after reconnect.
`conversations:changed` and `notifications:changed` carry no payload and require
an authoritative refresh. Known `message:created` deliveries update previews
locally; reconnect also refreshes membership, history, and inbox state.

## REST examples

These local examples require `CHAT_DEV_MODE=true`. Replace the conversation ID
with one returned by the API. For example, create/reuse a DM after a shared RSVP:

```sh
curl -sS http://127.0.0.1:4002/conversations/direct \
  -H 'x-demo-user-id: cathy' -H 'Content-Type: application/json' \
  -d '{"userId":"mina"}'
```

The `201` response is a conversation detail with `id: "direct-<database-id>"`,
`kind: "direct"`, `title`, `createdAt`, `memberCount`, optional `lastMessage`,
`members: [{ "userId", "displayName" }]`, and `messages: { "items", "nextCursor" }`.
Repeated or reverse requests reuse the same conversation. Load a history page:

```sh
curl -sS 'http://127.0.0.1:4002/conversations/event-7/messages?limit=2' \
  -H 'x-demo-user-id: cathy'
```

```json
{
  "items": [
    { "id": "41", "conversationId": "event-7", "senderUserId": "mina", "senderDisplayName": "Mina Park", "body": "See you there!", "createdAt": "2026-11-22T02:59:00.000Z" },
    { "id": "42", "conversationId": "event-7", "senderUserId": "cathy", "senderDisplayName": "Cathy Chen", "body": "Meet at the main entrance?", "createdAt": "2026-11-22T03:00:00.000Z" }
  ],
  "nextCursor": "41"
}
```

`items` is in chronological order. When `nextCursor` exists, pass
`?limit=2&before=41` to request older messages. It is omitted on the oldest page.
The limit defaults to 50 and must be between 1 and 100.

```sh
curl -sS http://127.0.0.1:4002/me/notifications -H 'x-demo-user-id: cathy'
curl -sS -X PATCH http://127.0.0.1:4002/me/notifications/91/read -H 'x-demo-user-id: cathy'
curl -i -X PATCH http://127.0.0.1:4002/me/notifications/read-all -H 'x-demo-user-id: cathy'
```

The inbox response is `{ "items": [<notification above>], "unreadCount": 1 }`,
with `nextCursor` only when another page exists. Pass `?before=<nextCursor>` for
older alerts. Reading one notification returns that item with `readAt`; reading
all returns `204` with no body. A user cannot read another account's notification.

## State across a chat service restart

| State | Behavior after restart |
| --- | --- |
| Saved group/DM messages, conversation IDs, direct members, latest-message previews | Restored from PostgreSQL; existing seeded history remains readable |
| Event chat access | Recomputed from current RSVP; historical sender membership cannot restore withdrawn access |
| Notification inbox, unread/read state, pending outbox deliveries | Preserved in PostgreSQL; reconnect loads saved state |
| Unsent drafts and live socket connections | Not stored by chat-api; the browser reconnects and reloads saved history |

## Verification

```sh
pnpm --filter @event-buddy/chat-api test
pnpm --filter @event-buddy/chat-api typecheck
```

The database regression runs the actual merged events API with real HTTP and
Socket.IO requests, using migrations 001–004 in a disposable database:

```sh
TEST_DATABASE_URL="$DATABASE_URL" pnpm --filter @event-buddy/chat-api test:membership
TEST_DATABASE_URL="$DATABASE_URL" pnpm --filter @event-buddy/chat-api test:persistence
```

`TEST_DATABASE_URL` must identify a PostgreSQL server on which the test user can
create a temporary database. The suite creates its own schema/profiles, exercises
real event creation and RSVP endpoints, verifies REST/socket revocation, restart,
and fail-closed behavior, and drops only its own test database. The general test
command skips these suites without `TEST_DATABASE_URL`; `test:membership` and
`test:persistence` require it. Persistence tests restart the actual server entry
point in separate processes, verify group/DM history and pagination, and inject
a deferred COMMIT failure to ensure unsaved messages cannot be broadcast.
`EVENTS_API_TEST_ROOT` optionally selects a separate events-api checkout for
compatibility testing; by default the suite uses this repository's events-api.
