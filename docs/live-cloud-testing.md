# Live Firebase and Spaces Checks

Regular pull-request CI continues to use the Firebase Auth Emulator, disposable PostgreSQL, and an in-memory storage adapter. The separate **Live Firebase and Spaces integration** workflow calls the actual Firebase Authentication and DigitalOcean Spaces services; it is started manually because it uses cloud credentials and creates external resources.

## One-time GitHub setup

Create a dedicated non-production Firebase project whose ID ends in `-ci`, enable Email/Password sign-in, and create a service account for that project. Create a separate Spaces test bucket and a bucket-scoped access key. In GitHub, add these as **environment secrets** under the `live-integration` environment:

| Secret | Purpose |
| --- | --- |
| `LIVE_FIREBASE_PROJECT_ID` | Dedicated Firebase project ID, ending in `-ci` |
| `LIVE_FIREBASE_API_KEY` | Web API key for the same Firebase project |
| `LIVE_FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON for Admin SDK user cleanup and verification-link generation |
| `LIVE_SPACES_ENDPOINT` | Region endpoint, such as `https://tor1.digitaloceanspaces.com` |
| `LIVE_SPACES_BUCKET` | Disposable test bucket |
| `LIVE_SPACES_ACCESS_KEY_ID` | Spaces test access key |
| `LIVE_SPACES_SECRET_ACCESS_KEY` | Matching Spaces secret |
| `DEMO_DATABASE_URL` | Optional, seeded non-production PostgreSQL database named `event_buddy_demo_*` for persistent image publishing |
| `DEMO_SPACES_BUCKET` | Optional Spaces bucket used for persistent demo photos |

Do not use the production Firebase project or a production database. Keep the live workflow manual and restrict write access to the protected `live-integration` environment. Never add credentials to source files or workflow YAML.

## Verify the live flow

Run the workflow with mode `verify_live_flow`, then type `RUN_LIVE_CLOUD_TESTS`. It creates a disposable PostgreSQL database and a temporary Firebase account, checks that the backend rejects the unverified account, verifies it through Firebase’s email action-code endpoint, creates a profile and event, uploads a photo through the image API, checks the database object key, downloads the signed Spaces URL, and compares the downloaded bytes. It removes the uploaded test object and Firebase account afterward. The disposable database is discarded with the job.

The test uses Firebase’s Admin SDK to generate a verification action link without sending an email to a fake test inbox; it applies the code through Firebase’s real Auth REST API. This tests account creation, verification, sign-in, and backend token validation without depending on external email delivery.

## Publish the mock event photos

The three committed photos correspond to `riverside-photo-walk`, `brampton-market`, and `toronto-clay-workshop`. To persist them, first ensure the `DEMO_DATABASE_URL` database has the current migrations and demo seeds. Run the workflow with mode `publish_demo_images`, then type `UPLOAD_DEMO_IMAGES`.

The job impersonates each seeded event owner only inside the dedicated CI Firebase project, sends each JPEG to `POST /events/:id/image`, and checks both the signed download and `events.image_object_key`. The image service writes the object key to PostgreSQL. The photos remain in Spaces and the keys remain in the configured demo database so Explore and event details can display them. The temporary Firebase fixture accounts are removed or restored after upload.

To publish from a local seeded database instead, start the auth and image APIs with real test-project and Spaces configuration, then run:

```sh
PUBLISH_DEMO_IMAGES_CONFIRM=UPLOAD_EVENT_BUDDY_DEMO_IMAGES \
  pnpm --filter @event-buddy/image-api exec tsx scripts/publish-demo-images.ts --keep
```

Use `--cleanup` to test upload/download and remove the uploaded objects and database keys after verification. Re-publishing replaces the previous image through the API, which removes the previous object under that event’s managed key prefix.
