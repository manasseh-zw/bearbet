import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export default defineConfig({
  out: './drizzle',
  schema: './src/server/infra/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
