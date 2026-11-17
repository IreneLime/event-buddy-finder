# Image API

Standalone backend for profile and event images stored in DigitalOcean Spaces. It is intentionally based on `main` and does not import user-api or events-api code.

## Dependency

Protected routes forward the Bearer token to `AUTH_API_URL/api/auth/session`, so the Firebase authentication PR must be deployed first. The service does not depend on Bella's event-service code; it checks event ownership directly through the shared PostgreSQL schema.

## Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service health check |
| `GET` | `/users/:id/image` | Public | Return a temporary signed profile-image URL |
| `POST` | `/me/profile/image` | Verified user | Upload or replace the current profile image |
| `DELETE` | `/me/profile/image` | Verified user | Remove the current profile image |
| `GET` | `/events/:id/image` | Public | Return a temporary signed event-image URL |
| `POST` | `/events/:id/image` | Event owner or group organizer | Upload or replace an event image |
| `DELETE` | `/events/:id/image` | Event owner or group organizer | Remove an event image |

Uploads use multipart form data with field name `image`. JPEG, PNG, and WebP files up to 5 MB are accepted. File contents are detected from their bytes rather than trusting the submitted filename or MIME header.

Objects remain private in Spaces. The backend returns presigned download URLs that expire after 15 minutes by default; configure the lifetime with `SPACES_DOWNLOAD_URL_EXPIRES_IN_SECONDS`. DigitalOcean Spaces uses `us-east-1` as the S3 signing region even though this bucket is located in `tor1` through `SPACES_ENDPOINT`.

## Bucket-free development

The service starts and builds without Spaces configuration. Upload, delete, and URL routes return `503` until all `SPACES_*` variables are configured. Tests can inject an in-memory implementation of `ObjectStorage` through `createApp` without contacting DigitalOcean.
