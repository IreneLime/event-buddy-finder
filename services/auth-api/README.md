# Auth and Profile API

Express + TypeScript service shell for Firebase identity integration and application profile management. Firebase Authentication will handle registration, sign-in, and email verification. This service will later validate Firebase ID tokens and provide profile endpoints; it does not store passwords.

Currently, the only route is `GET /health`. Firebase Admin credentials, token validation, profile persistence, and PostgreSQL access have not been configured yet.
