import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { config } from 'dotenv'
config({ path: '.dev.vars' })
import 'dotenv/config'
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN
})

export const db = drizzle(turso, { schema })
