# User API

Express + TypeScript service for Event Buddy Finder user profiles and category preferences.

## Authentication dependency

This service does not verify Firebase tokens itself. Protected requests forward their `Authorization: Bearer <token>` header to `AUTH_API_URL/api/auth/session`. The auth service verifies the token and returns the trusted Firebase UID, email, and email-verification status.

The Firebase authentication PR must therefore be deployed before protected user routes can work.

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

Apply `database/migrations/001_initial_schema.sql`, configure `.env`, start `auth-api` on port 4003, then run:

```sh
pnpm --filter @event-buddy/user-api dev
```
