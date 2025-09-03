import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import {
  contactTb,
  invoicesTb,
  userApiTokensTb,
  userInvoicingDetailsTb,
  userT
} from 'faktorio-db/schema'
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

  // Ensure user invoicing details exist
  await db
    .insert(userInvoicingDetailsTb)
    .values({
      user_id: TEST_USER_ID,
      name: 'API Test s.r.o.',
      street: 'Testovaci 1',
      city: 'Praha',
      zip: '11000',
      country: 'CZ',
      vat_no: 'CZ12345678',
      registration_no: '12345678'
    })
    .onConflictDoNothing()

  // Ensure at least one contact exists
  await db
    .insert(contactTb)
    .values({
      id: 'cnt_public_api_test_1',
      user_id: TEST_USER_ID,
      name: 'Test Client a.s.',
      street: 'Ulice 2',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
      main_email: 'client@example.com',
      variable_symbol: '20240001'
    })
    .onConflictDoNothing()

  await db.delete(invoicesTb)
  console.log('Seed complete for invoicing details and contact')
}
