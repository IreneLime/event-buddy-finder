import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Generation is possible without a running local database. Database commands
// use DATABASE_URL when it is set and otherwise target a local development URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/event_buddy_finder',
  },
})
