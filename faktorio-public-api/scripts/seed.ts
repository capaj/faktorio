import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { userApiTokensTb, userT } from 'faktorio-db/schema'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_USER_ID = 'user_public_api_test'
export const TEST_API_TOKEN = 'tok_faktorio_public_api_test_0000000000000000000'

export async function seedDb() {
  const url = process.env.TURSO_DATABASE_URL

  if (!url) {
    console.log(process.env)
    console.error('TURSO_DATABASE_URL is required')
    process.exit(1)
  }

  const client = createClient({ url })
  const db = drizzle(client)

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const migrationsFolder = resolve(__dirname, '../../faktorio-db/drizzle')

  await migrate(db, { migrationsFolder })

  await db
    .insert(userT)
    .values({
      id: TEST_USER_ID,
      email: 'api-test@example.com',
      name: 'API Test'
    })
    .onConflictDoNothing()

  await db
    .insert(userApiTokensTb)
    .values({ token: TEST_API_TOKEN, user_id: TEST_USER_ID })
    .onConflictDoNothing()

  console.log('Seed complete for user and API token')
}
