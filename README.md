# Event Buddy Finder

Event Buddy Finder is a course project for discovering local events and finding people to attend with. The repository is organized as a pnpm workspace so frontend and backend work can proceed in parallel.

## Project layout

```text
apps/web/                  React + TypeScript frontend
services/auth-api/         Express + TypeScript auth/profile service shell
services/events-api/       Express + TypeScript event service shell
services/chat-api/         Express + TypeScript chat/notification service shell
packages/contracts/        Shared TypeScript domain and API types
database/migrations/       PostgreSQL schema draft
```

The frontend currently uses local mock data. The three Express services expose health checks only; Firebase token validation, profile/event endpoints, PostgreSQL access, Socket.IO, and cloud storage will be added in later work.

## Get started

Requirements: Node.js 20.19+ and pnpm.

```sh
pnpm install
pnpm dev
```

The frontend runs at `http://localhost:5173`, the auth/profile service at `http://localhost:4003`, the event service at `http://localhost:4001`, and the chat/notification service at `http://localhost:4002`. Health checks are available at `/health` on each service.

Run just one app with `pnpm dev:web`, `pnpm dev:auth`, `pnpm dev:events`, or `pnpm dev:chat`. Use `pnpm build` and `pnpm typecheck` before opening a pull request.

## Frontend routes

- `/login` — sign-in and registration screen (presentation only)
- `/events` — search and browse public events
- `/events/:eventId` — event details and interest/going controls
- `/events/new` and `/events/:eventId/edit` — shared create/edit event form
- `/chats` and `/chats/:conversationId` — conversation list and chat view
- `/profile` and `/profile/:userId` — profile view; edit profile is linked from the current user's page

Attendance and chat actions currently update local component state only. They do not persist across reloads or call the backend.

## Contributing

1. Pull the latest `main` and create a focused feature branch.
2. Keep feature code in its app or service. Put shared request/response and domain types in `packages/contracts`.
3. Agree on API paths and payloads in the shared contracts before implementing an integration across frontend and backend.
4. Do not commit credentials. Start from `.env.example` and keep secrets in an untracked `.env`.
5. Run `pnpm build` and `pnpm typecheck` before requesting review.

Each area has a short README with its current scope and next integration steps.
