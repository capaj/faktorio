import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import {
  contactTb,
  invoicesTb,
  invoiceShareTb,
  userApiTokensTb,
  userInvoicingDetailsTb,
  userT
} from 'faktorio-db/schema'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_USER_ID = 'user_public_api_test'
export const TEST_API_TOKEN = 'tok_faktorio_public_api_test_0000000000000000000'
export const TEST_INVOICE_ID = 'inv_public_api_test_shared'
export const TEST_SHARE_ID = 'share_public_api_test_1'

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

  // Create a test invoice for shared invoice testing
  await db
    .insert(invoicesTb)
    .values({
      id: TEST_INVOICE_ID,
      user_id: TEST_USER_ID,
      number: '2024-SHARE-001',
      your_name: 'API Test s.r.o.',
      your_street: 'Testovaci 1',
      your_city: 'Praha',
      your_zip: '11000',
      your_country: 'CZ',
      your_registration_no: '12345678',
      your_vat_no: 'CZ12345678',
      client_name: 'Test Client a.s.',
      client_street: 'Ulice 2',
      client_city: 'Brno',
      client_zip: '60200',
      client_country: 'CZ',
      status: 'issued',
      issued_on: '2024-01-15',
      taxable_fulfillment_due: '2024-01-15',
      due_in_days: 14,
      due_on: '2024-01-29',
      payment_method: 'bank',
      currency: 'CZK',
      exchange_rate: 1,
      language: 'cs',
      total: 12100,
      subtotal: 10000,
      native_subtotal: 10000,
      native_total: 12100,
      client_contact_id: 'cnt_public_api_test_1'
    })
    .onConflictDoNothing()

  // Create a share link for the test invoice
  await db
    .insert(invoiceShareTb)
    .values({
      id: TEST_SHARE_ID,
      invoice_id: TEST_INVOICE_ID,
      user_id: TEST_USER_ID
    })
    .onConflictDoNothing()

  console.log('Seed complete for invoicing details and contact')
}
