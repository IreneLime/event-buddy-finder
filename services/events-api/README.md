# Events API

Express + TypeScript service for event discovery, management, and participation.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | No |
| `GET` | `/categories` | No |
| `GET` | `/events` | Optional |
| `GET` | `/events/:id` | Optional |
| `POST` | `/events` | Yes (+ email verified when Firebase is enabled) |
| `PATCH` | `/events/:id` | Yes (creator) |
| `DELETE` | `/events/:id` | Yes (soft-cancel) |
| `PUT` | `/events/:id/participation` | Yes (`interested` \| `going` \| `withdrawn`) |
| `GET` | `/events/:id/participants` | No |
| `GET` | `/me/events` | Yes |

## Local development

```sh
pnpm --filter @event-buddy/events-api dev
```

Requires PostgreSQL with migrations 001–004 applied. See the [database setup instructions](../../database/README.md).

### Auth

- Production / shared envs: set `FIREBASE_PROJECT_ID`, and optionally `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, then send `Authorization: Bearer <Firebase ID token>`.
- Local without Firebase (opt-in): set `ALLOW_DEV_AUTH=true` and send `Authorization: Bearer dev:<firebase_uid>` (verified) or `Bearer dev-unverified:<firebase_uid>` (signed in, email not verified).
  - Off by default
  - Disabled when `NODE_ENV=production`
  - Disabled whenever `FIREBASE_PROJECT_ID` is set
- Rejected mutation integration tests (non-owner edit/cancel, unverified create) skip unless `TEST_DATABASE_URL` is set:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm --filter @event-buddy/events-api test
```


### Environment

| Variable | Default |
|----------|---------|
| `PORT` | `4001` |
| `WEB_ORIGIN` | `http://localhost:5173` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/event_buddy_finder` |
| `ALLOW_DEV_AUTH` | `false` (opt-in; local only, no Firebase) |
| `FIREBASE_PROJECT_ID` | unset |
| `FIREBASE_CLIENT_EMAIL` | unset |
| `FIREBASE_PRIVATE_KEY` | unset |

Shared request/response types live in `@event-buddy/contracts`.

Event notification integration also requires migrations 002–003. See [real-time event notifications](../../docs/realtime-event-notifications.md).
