# Run Event Buddy Finder locally

Choose one of the two setup options below. Both use real Firebase Authentication and DigitalOcean Spaces. PostgreSQL stays local to your computer.

## Docker setup

1. Install and start Docker Desktop or Docker Engine with Compose.
2. From the repository root, copy `.env.example` to `.env` and add the team's Firebase web configuration, Firebase Admin service-account file path, and DigitalOcean Spaces credentials. Keep `.env` and the service-account file private and out of Git.
3. Run `./install.sh`. It builds the application, starts the app and PostgreSQL containers, applies migrations, and loads demo data on a fresh database.
4. Open [http://localhost:5180](http://localhost:5180).

Event listings are public. To use account features, register with an email address, verify the email through Firebase, and complete the profile. The seeded demo profiles are PostgreSQL display data; they are not Firebase login accounts.

Uploaded profile and event images are stored in DigitalOcean Spaces. PostgreSQL stores the associated object keys. Each developer's PostgreSQL data persists in the Docker volume across restarts and container rebuilds. `./install.sh --stop` stops the containers without deleting the database volume.

After pulling code updates, rerun `./install.sh` to apply pending migrations and rebuild the app. Existing database volumes keep their data; demo seeds are loaded only for a fresh database. If startup reports a port conflict, stop the other app instance or service using the port and retry.

## Run without Docker

Use this option if you prefer to run the application services directly on your computer.

1. Install Node.js 24 or newer, PostgreSQL, and `psql`, and make sure PostgreSQL is running.
2. Run `./install.sh --cloud`. On the first run, it creates `.env.local-install` from `local-install.env.example` and asks you to fill in the Firebase web configuration, Firebase Admin service-account path, and DigitalOcean Spaces credentials.
3. Run `./install.sh --cloud` again after completing the settings. It installs workspace dependencies, applies database migrations, and loads demo data on a fresh database before starting the services.
4. Open [http://localhost:5173](http://localhost:5173).

This option uses the PostgreSQL server on your computer rather than a Docker database. The `.env.local-install` file and service-account file are local credentials and must not be committed. Use `./install.sh --cloud --setup-only` to install dependencies and apply migrations without starting the services.
