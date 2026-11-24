# DigitalOcean Spaces Event-Cover Round-Trip Verification

Checked on November 23, 2026, from 11:36:23 PM to 11:36:25 PM EST against the real Firebase project, local PostgreSQL database, local Express services, and private DigitalOcean Space.

## Verification steps and results

1. Created two temporary Firebase Authentication users with verified email claims and signed both in through Firebase Authentication.
2. Sent both Firebase ID tokens to `GET /api/auth/session`. The auth API accepted both identities and confirmed that both email addresses were verified.
3. Created temporary PostgreSQL profiles for the organizer and second user through `POST /me/profile`.
4. Created a temporary organizer-owned event through `POST /events`.
5. Uploaded the first event cover through `POST /events/:id/image` using multipart field `image`.
   - PostgreSQL saved `event-images/1/eaf2eade-3d1d-4395-86b5-6a041568d6ec.png` on the event.
   - The object existed in DigitalOcean Spaces.
   - The returned signed URL downloaded the exact uploaded bytes with HTTP 200.
6. Signed in as the second account and requested the event cover through `GET /events/:id/image`.
   - The signed URL returned HTTP 200 and its bytes matched the first uploaded image.
7. Attempted to delete the cover as the non-owner.
   - The API returned HTTP 403.
   - The PostgreSQL reference and existing Spaces object remained unchanged.
8. Replaced the cover as the organizer.
   - PostgreSQL changed the reference to `event-images/1/b5734408-2747-4a1e-835c-d0be9f46bf05.jpg`.
   - The first object was removed from Spaces.
   - The replacement object existed and its signed URL returned the exact replacement bytes with HTTP 200.
9. Deleted the replacement cover as the organizer.
   - The API returned HTTP 204.
   - PostgreSQL cleared the event image reference.
   - The replacement object was removed from Spaces.
   - A later image lookup returned HTTP 404.

## Cleanup verification

- Both temporary Spaces object keys returned not found after cleanup.
- The local database contained zero temporary `Live Spaces verification` events after cleanup.
- The local database contained zero temporary `live-...@example.invalid` profiles after cleanup.
- A read-only Firebase Admin audit found zero temporary `live-...@example.invalid` users after cleanup.
- No ID tokens, passwords, signed URLs, Firebase private-key data, or DigitalOcean credentials were recorded in this document.

## Result

Passed. The implemented Firebase authentication, event ownership, PostgreSQL image-key persistence, private Spaces upload, signed retrieval, replacement cleanup, non-owner authorization, and deletion flow worked together end to end.
