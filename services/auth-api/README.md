# Auth and Profile API

Express + TypeScript service for Firebase identity verification and future application profile management. Firebase Authentication handles registration, sign-in, and email verification in the client; this service never stores passwords.

## Current routes

- `GET /health` — public service health check.
- `GET /api/auth/session` — verifies a Firebase Bearer token and returns its trusted identity claims.
- `GET /api/auth/verified` — also requires the Firebase `email_verified` claim.

The authentication middleware is ready to protect future profile routes. Profile persistence and PostgreSQL access are intentionally not implemented yet.

## Configuration

Copy `.env.example` to an ignored `.env`. For a real Firebase project, set `FIREBASE_PROJECT_ID` and provide Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`, inject `FIREBASE_SERVICE_ACCOUNT_JSON`, or use the same `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` variables supported by the events service. For the Authentication Emulator, set `FIREBASE_AUTH_EMULATOR_HOST` without `http://` or `https://`.

Set `DATABASE_URL` to the shared PostgreSQL deployment before profile routes are enabled. The service now exposes a reusable connection pool in `src/db/pool.ts`; no route queries the database yet.

Clients send the Firebase ID token as `Authorization: Bearer <token>`. Frontend state is not trusted as proof of identity or email verification.

The middleware follows the events service contract: authenticated requests expose `request.userId` and `request.emailVerified`, and API errors use `{ "error": "message" }`. The shared contract is intentional so the same Firebase identity can be used for event ownership and participation records keyed by `app_users.firebase_uid`.

Run `pnpm --filter @event-buddy/auth-api test`, `pnpm --filter @event-buddy/auth-api typecheck`, and `pnpm --filter @event-buddy/auth-api build` before integration.
