FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY services/auth-api/package.json ./services/auth-api/package.json
COPY services/user-api/package.json ./services/user-api/package.json
COPY services/events-api/package.json ./services/events-api/package.json
COPY services/chat-api/package.json ./services/chat-api/package.json
COPY services/image-api/package.json ./services/image-api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/storage/package.json ./packages/storage/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/v11 pnpm install --frozen-lockfile
COPY . .
CMD ["node", "deploy/local/dev.mjs"]
