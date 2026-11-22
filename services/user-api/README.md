# User API

Express + TypeScript service for Event Buddy Finder user profiles and category preferences.

## Authentication dependency

This service does not verify Firebase tokens itself. Protected requests forward their `Authorization: Bearer <token>` header to `AUTH_API_URL/api/auth/session`. The auth service verifies the token and returns the trusted Firebase UID, email, and email-verification status.

The Firebase authentication PR must therefore be deployed before protected user routes can work.

## Signup and profile lifecycle

Firebase creates the authenticated identity when registration succeeds, before the user verifies their email. The user API does not create an `app_users` row at that point. After verification, the frontend refreshes the Firebase token and requests `GET /me/profile`; a `404` means profile setup is still required. The PostgreSQL profile is created only when the verified user submits `POST /me/profile`, and it is always keyed by the trusted Firebase UID from the authentication service.

Guests and unverified signed-in users may browse public profiles and event history. `GET /me/profile` requires sign-in but not email verification, while creating or updating a profile requires both sign-in and verified email. Other services should use the same rule for protected state-changing actions so the frontend can consistently unlock them from the Firebase `emailVerified` state.

## Endpoints

| Method | Path | Authentication | Description |
|---|---|---|---|
| `GET` | `/health` | No | User-service health check |
| `GET` | `/me/profile` | Yes | Return the current user's private profile |
| `POST` | `/me/profile` | Yes, verified email | Create the current user's profile and preferences |
| `PATCH` | `/me/profile` | Yes, verified email | Update fields on an existing current-user profile |
| `GET` | `/users/:id` | No | Return a public profile without email |
| `GET` | `/users/:id/events` | No | Return paginated past events the user attended as `going` |
| `POST` | `/profiles/validate` | No | Validate and normalize a proposed signup/profile payload without saving it |

## Local development

Apply migrations 001–004 from the repository database guide, configure `.env`, start `auth-api` on port 4003, then run:

```sh
pnpm --filter @event-buddy/user-api dev
```
