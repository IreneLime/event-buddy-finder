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
also requires migrations 001–003 described in
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
  every history/member read, send, and recipient selection. Historical
  `conversation_members` rows never grant event access. Changes
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
- Message inserts and sender membership are committed together before Socket.IO
  delivery or acknowledgement. Storage failures return 503 without a memory
  fallback or a message broadcast. Concurrent reverse DM requests reuse one
  two-person conversation through a transaction-scoped ordered-pair lock.
- Event withdrawal revokes access without deleting historical membership rows or
  messages. Otherwise the schema's message foreign key would cascade-delete the
  former participant's messages. Current RSVP status controls event access.

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

No new migration is required for chat persistence: migrations 001–003 already
provide the conversation, membership, and message tables used by this adapter.
Existing database-seeded group/direct chats and their messages remain readable.
Keep this schema for the final-submission persistence integration; the separate
six-table proposal removes `conversation_members` and requires adapting and
retesting chat before combining it. See [schema integration order](../../database/README.md#chat-persistence-and-schema-consolidation).
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

## Verification

```sh
pnpm --filter @event-buddy/chat-api test
pnpm --filter @event-buddy/chat-api typecheck
```

The database regression runs the actual merged events API with real HTTP and
Socket.IO requests, using migrations 001–003 in a disposable database:

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
