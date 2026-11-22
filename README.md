# Event Buddy Finder

Event Buddy Finder is a course project for discovering local events and finding people to attend with. The repository is organized as a pnpm workspace so frontend and backend work can proceed in parallel.

## Project layout

```text
apps/web/                  React + TypeScript frontend
services/auth-api/         Express + TypeScript authentication service shell
services/user-api/         Express + TypeScript user profile service
services/events-api/       Express + TypeScript event service shell
services/chat-api/         Express + TypeScript chat/notification service shell
services/image-api/        Express + TypeScript profile/event image service
packages/contracts/        Shared TypeScript domain and API types
packages/storage/          Shared DigitalOcean Spaces-compatible client
database/migrations/       PostgreSQL schema draft
```

The user service implements PostgreSQL-backed profile endpoints and delegates Bearer-token verification to the auth service. Chat adds Socket.IO messaging, a refreshed interface, and event notifications. Event chat membership reads the authoritative PostgreSQL event/RSVP records owned by events-api.

The frontend retains demo sign-in. Apply the shared database migrations and use the same database URL across services to run the integrated event, chat, and notification flows.

## Get started

Requirements: Node.js 20.19+ and pnpm.

```sh
pnpm install
pnpm dev
```

The frontend runs at `http://localhost:5173`, the auth service at `http://localhost:4003`, the user service at `http://localhost:4004`, the event service at `http://localhost:4001`, the chat/notification service at `http://localhost:4002`, and the image service at `http://localhost:4005`. Health checks are available at `/health` on each service.

Run just one app with `pnpm dev:web`, `pnpm dev:auth`, `pnpm dev:users`, `pnpm dev:events`, `pnpm dev:chat`, or `pnpm dev:images`. Use `pnpm build` and `pnpm typecheck` before opening a pull request.

## Frontend routes

- `/login` — sign-in and registration screen (presentation only)
- `/events` — search and browse public events
- `/events/:eventId` — event details and interest/going controls
- `/events/new` and `/events/:eventId/edit` — shared create/edit event form
- `/chats` and `/chats/:conversationId` — conversation list and chat view
- `/notifications` — saved event alerts and browser notification settings
- `/profile` and `/profile/:userId` — profile view; edit profile is linked from the current user's page

Chat messages, direct conversations, and notifications persist in PostgreSQL across service restarts. Event access follows the authoritative RSVP records. See [chat and notifications](services/chat-api/README.md) and [regression tests](docs/realtime-testing.md).

Run `TEST_DATABASE_URL=... pnpm test:e2e:chat` for Chromium group-chat, public-profile DM, and notification journeys against a disposable PostgreSQL database, including real chat service restarts. See [browser test setup and standalone DM checks](tests/e2e/README.md).

## Contributing

1. Pull the latest `main` and create a focused feature branch.
2. Keep feature code in its app or service. Put shared request/response and domain types in `packages/contracts`.
3. Agree on API paths and payloads in the shared contracts before implementing an integration across frontend and backend.
4. Do not commit credentials. Start from `.env.example` and keep secrets in an untracked `.env`.
5. Run `pnpm build` and `pnpm typecheck` before requesting review.

Each area has a short README with its current scope and next integration steps.
