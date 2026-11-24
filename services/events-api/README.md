# Events API

Express + TypeScript service for event discovery, management, and participation.

Protected mutations take the caller from `Authorization: Bearer …` only — never from the request body. Errors use `{ "error": "message" }` (optional `details`). Shared request/response types live in `@event-buddy/contracts`.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | No |
| `GET` | `/categories` | No |
| `GET` | `/events` | Optional |
| `GET` | `/events/:id` | Optional |
| `POST` | `/events` | Yes + email verified |
| `PATCH` | `/events/:id` | Yes (creator) |
| `DELETE` | `/events/:id` | Yes (creator; soft-cancel) |
| `PUT` | `/events/:id/participation` | Yes (`interested` \| `going` \| `withdrawn`) |
| `GET` | `/events/:id/participants` | No |
| `GET` | `/me/events` | Yes |

## Local development

```sh
pnpm --filter @event-buddy/events-api dev
```

Requires PostgreSQL with migrations 001–004 applied. See the [database setup instructions](../../database/README.md). Default listen address: `http://127.0.0.1:4001`.

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

Event notification integration also requires migrations 002–003. See [real-time event notifications](../../docs/realtime-event-notifications.md).

## API examples

Examples below assume the service is on `http://127.0.0.1:4001` with `ALLOW_DEV_AUTH=true` and a seeded `demo-mina` / `demo-cathy` profile. Replace `dev:demo-mina` with a Firebase ID token in shared environments.

### Search and pagination

`GET /events` is public. Defaults: `page=1`, `limit=20`, `status=scheduled`, `sortBy=startsAt`, `order=asc`. With a Bearer token, each item may include `viewerParticipation`.

```sh
curl -sS 'http://127.0.0.1:4001/events?search=market&city=Toronto&category=Food&page=1&limit=20&sortBy=startsAt&order=asc'
```

Success `200`:

```json
{
  "items": [
    {
      "id": "night-market",
      "title": "Lanterns & Late Bites",
      "description": "Spend a relaxed Sunday evening exploring the food stalls…",
      "startsAt": "2026-11-15T23:30:00.000Z",
      "endsAt": "2026-11-16T02:30:00.000Z",
      "locationName": "Stackt Market",
      "city": "Toronto",
      "address": "28 Bathurst St, Toronto, ON",
      "categoryNames": ["Food", "Community"],
      "status": "scheduled",
      "organizerName": "Mina Park",
      "organizerUserId": "demo-mina",
      "participantCount": 3
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

| Query | Notes |
|-------|-------|
| `page`, `limit` | `limit` max `100` |
| `search` | Case-insensitive match on title, description, or location name |
| `category` | Exact category name |
| `city`, `location` | City exact / location-or-address match |
| `startDate`, `endDate` | ISO-8601 datetimes with offset; filter on `startsAt` |
| `status` | `scheduled` (default) or `cancelled` |
| `sortBy` | `startsAt`, `createdAt`, or `title` |
| `order` | `asc` or `desc` |

Relevant errors: `400` validation failed (bad query values).

### Create an event

`POST /events` requires a signed-in user with a verified email and an existing `app_users` profile. Returns `201`.

```sh
curl -sS -X POST http://127.0.0.1:4001/events \
  -H 'Authorization: Bearer dev:demo-mina' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Neighbourhood Walk",
    "description": "A relaxed walk with time to meet neighbours and enjoy the park.",
    "startsAt": "2026-12-10T18:00:00Z",
    "endsAt": "2026-12-10T20:00:00Z",
    "locationName": "Trinity Bellwoods Park",
    "city": "Toronto",
    "address": "Meet at the south entrance",
    "notes": "Bring comfortable shoes and a water bottle.",
    "categoryNames": ["Community", "Outdoors"]
  }'
```

Success `201` (shape is `EventSummary`; `id` is the public id or numeric id as text):

```json
{
  "id": "42",
  "title": "Neighbourhood Walk",
  "description": "A relaxed walk with time to meet neighbours and enjoy the park.",
  "startsAt": "2026-12-10T18:00:00.000Z",
  "endsAt": "2026-12-10T20:00:00.000Z",
  "locationName": "Trinity Bellwoods Park",
  "city": "Toronto",
  "address": "Meet at the south entrance",
  "notes": "Bring comfortable shoes and a water bottle.",
  "categoryNames": ["Community", "Outdoors"],
  "status": "scheduled",
  "organizerName": "Mina Park",
  "organizerUserId": "demo-mina",
  "participantCount": 0
}
```

| Status | When |
|--------|------|
| `401` | Missing / invalid token |
| `403` | Email not verified (`Email verification is required before creating events`) |
| `400` | Validation failed, missing profile, invalid categories, or `endsAt` ≤ `startsAt` |

### Edit an event

`PATCH /events/:id` requires auth. Only the creator may update. Cancelled events cannot be edited. At least one field is required.

```sh
curl -sS -X PATCH http://127.0.0.1:4001/events/night-market \
  -H 'Authorization: Bearer dev:demo-mina' \
  -H 'Content-Type: application/json' \
  -d '{
    "locationName": "Stackt Market · side entrance",
    "startsAt": "2026-11-15T23:45:00Z",
    "notes": "Meet by the Bathurst Street door."
  }'
```

Success `200`: updated `EventSummary` (same shape as create).

| Status | When |
|--------|------|
| `401` | Missing / invalid token |
| `403` | Caller is not the creator (`You do not have permission to manage this event`) |
| `404` | Event not found |
| `400` | Validation failed, cancelled event, invalid categories, or `endsAt` ≤ `startsAt` |

### RSVP (participation)

`PUT /events/:id/participation` requires auth and an `app_users` profile. Body status must be `interested`, `going`, or `withdrawn`. Returns the updated event, including `viewerParticipation`.

```sh
curl -sS -X PUT http://127.0.0.1:4001/events/night-market/participation \
  -H 'Authorization: Bearer dev:demo-cathy' \
  -H 'Content-Type: application/json' \
  -d '{ "status": "interested" }'
```

Success `200`:

```json
{
  "id": "night-market",
  "title": "Lanterns & Late Bites",
  "description": "Spend a relaxed Sunday evening exploring the food stalls…",
  "startsAt": "2026-11-15T23:30:00.000Z",
  "locationName": "Stackt Market",
  "city": "Toronto",
  "categoryNames": ["Food", "Community"],
  "status": "scheduled",
  "organizerName": "Mina Park",
  "organizerUserId": "demo-mina",
  "participantCount": 3,
  "viewerParticipation": "interested"
}
```

| Status | When |
|--------|------|
| `401` | Missing / invalid token |
| `404` | Event not found |
| `400` | Validation failed, missing profile, or cancelled event |
| `409` | Setting `going` when the event is at capacity |

### Cancel an event

`DELETE /events/:id` soft-cancels (`status` → `cancelled`). Only the creator may cancel. Participation rows are kept. Returns the cancelled `EventSummary`.

```sh
curl -sS -X DELETE http://127.0.0.1:4001/events/42 \
  -H 'Authorization: Bearer dev:demo-mina'
```

Success `200`:

```json
{
  "id": "42",
  "title": "Neighbourhood Walk",
  "description": "A relaxed walk with time to meet neighbours and enjoy the park.",
  "startsAt": "2026-12-10T18:00:00.000Z",
  "locationName": "Trinity Bellwoods Park",
  "city": "Toronto",
  "categoryNames": ["Community", "Outdoors"],
  "status": "cancelled",
  "organizerName": "Mina Park",
  "organizerUserId": "demo-mina",
  "participantCount": 0
}
```

| Status | When |
|--------|------|
| `401` | Missing / invalid token |
| `403` | Caller is not the creator (`You do not have permission to manage this event`) |
| `404` | Event not found |
| `400` | Event is already cancelled |
