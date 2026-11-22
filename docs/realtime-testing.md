# Chat and notification regression tests

Run from the repository root after `pnpm install`:

```sh
pnpm test:realtime
```

This runs chat unit/API/WebSocket tests and frontend tests. Each new unit test
starts with a fresh store; the WebSocket suite starts a fresh server per test.

For actual PostgreSQL persistence and event membership checks:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm test:realtime:db
```

Use a local test PostgreSQL instance with permission to create databases. The
suites create disposable databases, apply migrations, exercise actual HTTP and
Socket.IO connections, and remove their test databases afterward. The explicit
database command fails if `TEST_DATABASE_URL` is missing; ordinary package test
commands skip the database suites when it is absent.

## Requirement coverage

| Requirement | Test location | Verification |
| --- | --- | --- |
| Dedicated group chat for each event | `services/chat-api/tests/chat-service.test.ts`, `event-membership.test.ts` | Idempotent chat creation, separate histories, automatic chat resolution for a real event |
| Direct messages between interested attendees | `services/chat-api/tests/chat-service.test.ts` | Shared event required, two-person membership, reverse lookup reuses the chat, outsiders cannot read |
| Verify permission before saving | `services/chat-api/tests/chat-service.test.ts`, `realtime-chat.test.ts`, `event-membership.test.ts` | Rejected messages leave history unchanged; withdrawal revokes existing sockets; database authority failures fail closed |
| Real-time group and direct messages | `services/chat-api/tests/realtime-chat.test.ts` | Actual WebSockets deliver to sender and recipient tabs; group attendees and unrelated users receive only authorized messages |
| Update chat without refreshing the page | `apps/web/tests/chat-session.test.tsx` | An incoming message renders with history requests disabled, keeps the mounted transcript and unsent draft, and deduplicates repeat delivery |
| Update chat previews without per-message list queries | `apps/web/tests/chat-session.test.tsx` | With 25 additional event chats, known incoming/outgoing messages update and sort previews without list/inbox requests; duplicate, older, tied-timestamp, and delayed-list responses preserve the latest preview; unknown chats, membership changes, and reconnects fetch authoritative lists |
| Serialize first organizer withdrawal with sends | `services/chat-api/tests/event-membership.test.ts` | The actual RSVP HTTP endpoint acquires the event advisory lock before its first withdrawal insert; concurrent recipient/sender socket sends are observed waiting via PostgreSQL lock state, then exclude or reject the organizer after withdrawal commits |
| Previous conversations available on return | `postgres-chats.test.ts`, `realtime-chat.test.ts`, `apps/web/tests/chat-session.test.tsx` | Actual server process restarts preserve group/DM history, membership, IDs, and summaries; reconnects recover missed messages |
| Save messages in PostgreSQL before broadcasting | `services/chat-api/tests/postgres-chats.test.ts` | Saved database rows match delivered messages; a deferred COMMIT failure returns an error, rolls back sender membership/message inserts, and emits nothing |
| Durable direct chats and history pagination | `services/chat-api/tests/postgres-chats.test.ts` | Concurrent reverse requests reuse one DM; timestamp ties paginate without overlap; cross-conversation cursors are rejected |
| Persist alerts for interested, pending, and approved attendees | `services/events-api/tests/event-notifications.test.ts` | Actual PostgreSQL rows for `interested`, `pending_approval`, and `going`; excludes withdrawn/declined users and the actor |
| Live event update/cancellation alerts | `services/events-api/tests/event-notifications.test.ts`, `apps/web/tests/notifications.test.tsx` | Actual Socket.IO delivery for eligible users, matching saved notification IDs, live in-app alerts and unread counts |
| Offline and restart recovery | `services/events-api/tests/event-notifications.test.ts`, `apps/web/tests/notifications.test.tsx` | Both notification kinds survive disconnects; outbox and read state survive service restarts; mounted UI reloads inbox on reconnect |
| Optional browser notifications | `apps/web/tests/notifications.test.tsx` | Explicit opt-in, per-account preference, enabled browser delivery, and working in-app alerts when browser permission is denied |

The socket tests register listeners before triggering changes and fail if the
expected push does not arrive within 3–5 seconds. This is a regression timeout,
not a latency benchmark. Negative-delivery checks use a later packet on the same
connection to wait for earlier packets, avoiding arbitrary sleeps.

## PostgreSQL chat history

Normal startup uses `PostgresChats` with the consolidated tables from migrations
001–004. `MemoryChatStore` remains an isolated unit/demo fixture. Direct-chat
participants are stored on `conversations`; event-chat access comes from the
current event and RSVP rows. A database failure never falls back to memory.

`postgres-chats.test.ts` starts the actual `src/index.ts` in a child process,
sends group/direct messages, checks the database, terminates that process, and
starts a fresh process against the same database. It verifies restored messages,
conversation IDs/members, latest-message summaries, permissions, and continued
live delivery. Other regressions cover existing seeded history, concurrent DM
creation, cursor boundaries, withdrawal without message deletion, blocked hard
deletion of chat-linked profiles, and database failures. The previous persistence
TODO has been replaced by executable tests.
