# Chat and Notifications API

Implements API from `meetings/2026-11-11.md`, with an Express
service, Socket.IO delivery, and the existing web chat/notification UI connected.
This is a local integration framework: storage is in memory, and Firebase and
PostgreSQL are not connected. Refreshing the browser preserves messages while the
service stays running; restarting the service resets all data.

## Run

From the repository root:

```sh
pnpm install
pnpm dev:chat
pnpm dev:web
```

Open `http://localhost:5173/chats`. The service listens on `127.0.0.1:4002`.
The development script explicitly enables `CHAT_DEV_MODE=true`. REST requests
send `x-demo-user-id: cathy`; Socket.IO sends `auth: { demoUserId: 'cathy' }`.
Other seeded users include `mina`, `alex`, `clay-club`, `nadia`, `slow-club`, and
`run-club`. Set `VITE_CHAT_DEMO_USER_ID` when running a second frontend to test
another user, or use two browser tabs for the same user.

`VITE_CHAT_API_URL` defaults to `http://localhost:4002` in Vite development.
`WEB_ORIGIN`, `HOST`, and `PORT` configure the service. Outside development the
frontend requires an explicit API URL or uses its own origin. Fake identities are
disabled in production; service startup fails unless a real identity verifier is
injected. The login screen remains the existing prototype.

## API names

All routes except `GET /health` require an identity. IDs in paths are conversation
IDs unless the path explicitly says `eventId`. A conversation ID is independent
of its event ID.

| API plan name | HTTP endpoint | Input / behavior |
| --- | --- | --- |
| CreateGroupChat | `POST /CreateGroupChat` | `{ eventId, title }`; starts with the host as its only member, idempotent per event |
| GetGroupChat | `GET /GetGroupChat/:id` | Conversation, members, and latest 50 messages |
| ListGroupChats | `GET /ListGroupChats` | `{ items }`; current user's event chats and direct conversations |
| UpdateGroupChat | `PATCH /UpdateGroupChat/:id` | `{ status: 'interested' \| 'going' \| 'withdrawn' }` changes the caller's participation and membership |
| UpdateGroupChat | `PATCH /UpdateGroupChat/:id` | `{ title, kind: 'event_updated' \| 'event_cancelled' }`; organizer only, saves and broadcasts notifications |
| DeleteGroupChat | `DELETE /DeleteGroupChat/:id` | Organizer only; deletes the group chat and its messages, returns 204 |

Additional chat APIs from the plan:

| Endpoint | Behavior |
| --- | --- |
| `GET /events/:eventId/conversation` | Resolves an event to its chat; requires membership |
| `POST /events/:eventId/conversation/membership` | Joins a chat and records interest; preserves an existing Going status |
| `GET /conversations/:id/members` | Current member list |
| `GET /conversations/:id/messages?limit=50&before=<messageId>` | Oldest-to-newest messages; `nextCursor` loads earlier history; limit 1–100 |
| `POST /conversations/:id/messages` | `{ body }`; REST alternative to Socket.IO, same checks and broadcast |
| `POST /conversations/direct` | `{ userId }`; idempotently starts a private conversation with someone sharing an active event |
| `GET /me/notifications` | Saved alerts, newest first |
| `PATCH /me/notifications/:id/read` | Marks only the caller's own notification read |

Errors have `{ code, message }` and use 400 (validation), 401 (identity),
403 (permissions), 404 (missing resource), or 409 (host cannot leave).
Messages must contain 1–2000 non-whitespace characters. Request bodies are limited
to 16 KB. A missing or forbidden chat never falls back to a different conversation.

## Socket.IO

| Direction | Event | Payload |
| --- | --- | --- |
| Client → server | `message:send` | `{ conversationId, body }`, acknowledgment `{ ok: true, data: message }` or `{ ok: false, error }` |
| Server → client | `message:created` | Stored message, including sender ID/name and timestamp |
| Server → client | `conversations:changed` | Reload list/details after membership or lifecycle changes |
| Server → client | `notification:created` | Saved notification for that recipient |
| Server → client | `notifications:changed` | Refresh the recipient's inbox after read-state changes |

The server determines recipients from current membership on every send. Connected
users who withdraw immediately lose history/send access and future delivery.
Frontend reconnects reload server state, messages are deduplicated by ID, failed
sends keep the draft, and loading/empty/error states are shown. The check beside a
sent message means the server accepted it; read receipts are not implemented.

## Structure and integration handoff

- `src/app.ts`: HTTP routes, identity boundary, Socket.IO, error responses.
- `src/auth.ts`: replaceable `VerifyIdentity`; development adapter only for now.
- `src/chat-service.ts`: named GroupChat operations, participation/membership,
  messages, private chats, and notification rules.
- `src/store.ts`: isolated memory adapter and chat-side event/participation records.
- `src/seed.ts`: local fixtures matching existing frontend event IDs.
- `src/index.ts`: local startup and shutdown.
- `tests/chat-api.test.ts`: HTTP and multi-client Socket.IO integration tests.

Frontend changes are limited to chat/notification files, the provider wiring in
`App.tsx`, and replacing the notification placeholder in the shared header.
Shared contracts and Socket.IO dependencies support these changes. Event CRUD,
event pages/store, profile/auth service, and database schema are unchanged.
Existing `/chats/<eventId>` links are resolved in the chat page; a user can join
there, after which the URL uses the real conversation ID.

The participation adapter follows the meeting plan's interested/going/withdrawn
states. Approval workflow changes must be agreed with the event module separately.

## Checks

```sh
pnpm --filter @event-buddy/chat-api test
pnpm --filter @event-buddy/chat-api typecheck
pnpm --filter @event-buddy/web build
```
