# Chat and Notifications API

Express and Socket.IO chat with event membership read from the authoritative
PostgreSQL records owned by events-api. Chat messages, direct conversations,
and notifications persist in PostgreSQL across service restarts. Firebase sessions
are verified through the auth API. Demo identity headers are development-only.

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
to hard-coded chat fixtures. For Firebase locally, run `CHAT_DEV_MODE=false pnpm dev:chat` and set `AUTH_API_URL` if the auth service is not on localhost:4003. Production uses the verified Firebase UID directly.

## Events API owns chat membership

- Create events through events-api `POST /events`. Every real event resolves to
  a deterministic `event-<database-id>` conversation on lookup/listing. No separate
  CreateGroupChat call or seeded chat is required. An unknown event is rejected.
- RSVP through events-api `PUT /events/:id/participation`. Only `interested` and
  `going` allow access. The creator has implicit access until an explicit RSVP
  overrides it; an explicit creator withdrawal also revokes access.
- Chat reads the same `events`, `event_participations`, and `app_users` rows on
  every history/member read, send, and recipient selection. Its in-memory member
  sets are rendering projections, never independent permission grants. Changes
  take effect on the next operation without waiting for a sync job or reconnect.
- After a committed withdrawal, REST reads/writes and already connected Socket.IO
  sends are rejected, and subsequent messages are not delivered to that user.
  Already received messages cannot be retracted from a client.
- Failed database lookups return 503 and never fall back to cached permissions.
  All authority reads complete before a message is saved or acknowledged.
- Joining/leaving from the frontend also writes through events-api. An RSVP update
  refreshes chat state and invalidates the open chat view. A lookup never silently
  re-enrolls a withdrawn user.
- Restarting chat preserves event membership and stable conversation IDs, while
  messages and direct conversations persist in PostgreSQL.
- The consolidated schema stores each direct chat's ordered pair in the two
  participant columns on `conversations`; event-chat membership is always
  derived from the event owner and current RSVP. Messages do not depend on a
  membership table, so leaving an event chat revokes access without deleting
  message history. Foreign keys restrict hard deletion of accounts referenced
  by chat history.

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
injects `PostgresEventMembership`, including in development. Production startup
requires both an identity verifier and an authoritative membership source.

Socket.IO `message:send` accepts `{ conversationId, body }` and acknowledges a
saved message or error. The sender comes from the verified socket identity.
`message:created`, `conversations:changed`, `notification:created`, and
`notifications:changed` update the frontend. Message bodies contain 1–2000
non-whitespace characters; request bodies are limited to 16 KB. Read receipts are
not implemented.

## Verification

```sh
pnpm --filter @event-buddy/chat-api test
pnpm --filter @event-buddy/chat-api typecheck
```

The database regression runs the actual merged events API with real HTTP and
Socket.IO requests, using migrations 001–004 in a disposable database:

```sh
TEST_DATABASE_URL="$DATABASE_URL" pnpm --filter @event-buddy/chat-api test:membership
```

`TEST_DATABASE_URL` must identify a PostgreSQL server on which the test user can
create a temporary database. The suite creates its own schema/profiles, exercises
real event creation and RSVP endpoints, verifies REST/socket revocation, restart,
and fail-closed behavior, and drops only its own test database. The general test
command skips this suite without `TEST_DATABASE_URL`; `test:membership` requires
it. `EVENTS_API_TEST_ROOT` optionally selects a separate events-api checkout for
compatibility testing; by default the suite uses this repository's events-api.
