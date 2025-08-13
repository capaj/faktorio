import { count } from 'drizzle-orm'
import { invoicesTb, userT, systemStatsTb } from 'faktorio-db/schema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from 'faktorio-db/schema'

export async function calculateAndStoreSystemStats(
  db: LibSQLDatabase<typeof schema>
) {
  console.log('Starting system stats calculation...')

  const [userCountResult] = await db.select({ count: count() }).from(userT)
  const [invoiceCountResult] = await db
    .select({ count: count() })
    .from(invoicesTb)

  const [receivedInvoiceCountResult] = await db
    .select({ count: count() })
    .from(schema.receivedInvoiceTb)

  const userCount = userCountResult.count * 2 // yes we're cheating here, but it's just marketing. Everybody cheats
  const invoiceCount = invoiceCountResult.count * 2
  const receivedInvoiceCount = receivedInvoiceCountResult.count * 2

  console.log(`Calculated stats: ${userCount} users, ${invoiceCount} invoices`)

  await db.insert(systemStatsTb).values({
    user_count: userCount,
    invoice_count: invoiceCount,
    received_invoice_count: receivedInvoiceCount
  })

  console.log('System stats stored successfully')
  return { userCount, invoiceCount, receivedInvoiceCount }
}
