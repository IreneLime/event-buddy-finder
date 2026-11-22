# Run Event Buddy Finder locally

1. Start Docker Desktop or Docker Engine with Docker Compose.
2. From the repository root, run `./install.sh`. The first run downloads and builds the containers, initializes PostgreSQL with the checked-in demo data, and starts the app.
3. Open [http://127.0.0.1:5180](http://127.0.0.1:5180). Sign in as `cathy.chen@example.com` or `mina.park@example.com` with password `demo only`.

The default setup includes the Firebase Auth Emulator and S3-compatible local image storage. It needs no Firebase or DigitalOcean credentials. Use two browser profiles to open **Event Buddy Demo Meetup** as both users and test chat. As Cathy, you can edit the event to test live notifications and upload a cover to test image storage.

Run `./install.sh --stop` to stop the containers while keeping the database and uploaded images. Use the preconfigured accounts for repeat demos. Additional emulator accounts and in-memory chat history reset when the app container stops.

After pulling updates, rerun `./install.sh`. It applies pending database migrations before starting the app, including migration 004 for the consolidated six-table schema. Existing Docker volumes keep their data and the seed runs only on fresh setup. A failed migration stops startup and can be retried after the issue is fixed. If the database has migrations missing from your checkout, switch to a branch that includes them before restarting.

If setup reports a port conflict, stop the other instance of the app or the service occupying that port, then retry.

## Connect to shared cloud services

Use `./install.sh --cloud` only to run against real Firebase Authentication and DigitalOcean Spaces. This mode requires Node.js 24+, a running PostgreSQL server and `psql`. On the first run it creates `.env.local-install` for the team's Firebase and Spaces credentials. Fill those in and rerun `./install.sh --cloud`. The config is ignored by Git.
