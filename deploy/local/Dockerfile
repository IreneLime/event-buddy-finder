FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0 firebase-tools@15.37.0
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["firebase", "emulators:exec", "--project", "demo-event-buddy-local", "--only", "auth", "--config", "deploy/local/firebase.json", "node deploy/local/bootstrap.mjs && pnpm dev"]
