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
| `PATCH` | `/events/:id` | Yes (creator or group organizer) |
| `DELETE` | `/events/:id` | Yes (soft-cancel) |
| `PUT` | `/events/:id/participation` | Yes (`interested` \| `going` \| `withdrawn`) |
| `GET` | `/events/:id/participants` | No |
| `GET` | `/me/events` | Yes |

## Local development

```sh
pnpm --filter @event-buddy/events-api dev
```

Requires PostgreSQL with [database/migrations/001_initial_schema.sql](../../database/migrations/001_initial_schema.sql) applied.

### Auth

- Production / shared envs: set `FIREBASE_PROJECT_ID`, and optionally `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, then send `Authorization: Bearer <Firebase ID token>`.
- Local without Firebase: send `Authorization: Bearer dev:<firebase_uid>` (enabled when `ALLOW_DEV_AUTH` is not `false`).

### Environment

| Variable | Default |
|----------|---------|
| `PORT` | `4001` |
| `WEB_ORIGIN` | `http://localhost:5173` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/event_buddy_finder` |
| `ALLOW_DEV_AUTH` | `true` |
| `FIREBASE_PROJECT_ID` | unset |
| `FIREBASE_CLIENT_EMAIL` | unset |
| `FIREBASE_PRIVATE_KEY` | unset |

Shared request/response types live in `@event-buddy/contracts`.
