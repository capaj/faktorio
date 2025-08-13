import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const envPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../faktorio-api/.dev.vars'
)
config({ path: envPath })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN
})

export const db = drizzle(turso, { schema })
