import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from 'faktorio-db/schema'
import { invoiceRouter } from './invoiceRouter'
import type { TrpcContext } from '../../trpcContext'

let client: Client
let ctx: TrpcContext

function invoice(
  number: string,
  contactId: string,
  date: string,
  userId = 'owner'
): typeof schema.invoicesTb.$inferInsert {
  return {
    id: number,
    number,
    user_id: userId,
    client_contact_id: contactId,
    client_name: 'Original client name',
    client_street: '',
    client_city: '',
    your_name: 'Seller',
    your_street: '',
    your_city: '',
    your_zip: '',
    your_country: 'CZ',
    your_registration_no: '',
    your_vat_no: '',
    taxable_fulfillment_due: date,
    issued_on: date,
    due_on: date,
    due_in_days: 0,
    currency: 'CZK',
    payment_method: 'bank',
    subtotal: 100,
    total: 100,
    native_subtotal: 100,
    native_total: 100
  }
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: '../faktorio-db/drizzle' })
  const [user] = await db
    .insert(schema.userT)
    .values([
      { id: 'owner', email: 'owner@example.test', name: 'Owner' },
      { id: 'other', email: 'other@example.test', name: 'Other' }
    ])
    .returning()
  await db.insert(schema.contactTb).values([
    { id: 'client', user_id: user.id, name: 'Renamed client' },
    { id: 'same-name', user_id: user.id, name: 'Original client name' },
    { id: 'other-client', user_id: 'other', name: 'Original client name' }
  ])
  await db
    .insert(schema.invoicesTb)
    .values([
      invoice('2025-001', 'client', '2025-09-01'),
      invoice('2026-001', 'client', '2026-09-01'),
      invoice('2026-002', 'same-name', '2026-09-01'),
      invoice('2026-003', 'other-client', '2026-09-01', 'other'),
      invoice('2026-004', 'client', '2026-09-01', 'other')
    ])
  ctx = {
    db,
    user,
    env: {} as TrpcContext['env'],
    req: new Request('https://app.example.test'),
    sendEmail: vi.fn(),
    generateToken: vi.fn()
  }
})

afterEach(() => client.close())

describe('invoice contact filtering', () => {
  it('matches the exact saved contact across years, even after a name change', async () => {
    const invoices = await invoiceRouter.createCaller(ctx).listInvoices({
      contactId: 'client',
      limit: null
    })
    expect(invoices.map((invoice) => invoice.number).sort()).toEqual([
      '2025-001',
      '2026-001'
    ])
  })

  it('combines the contact with the year and text search', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    expect(
      await caller.listInvoices({
        contactId: 'client',
        year: 2026,
        filter: '2026-001',
        limit: null
      })
    ).toMatchObject([{ number: '2026-001' }])
    expect(
      await caller.listInvoices({
        contactId: 'client',
        filter: '2026-002',
        limit: null
      })
    ).toEqual([])
  })

  it('returns no invoices for an unknown or another user’s contact', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    for (const contactId of ['missing', 'other-client']) {
      expect(await caller.listInvoices({ contactId, limit: null })).toEqual([])
    }
  })

  it('preserves the unfiltered list and requires authentication', async () => {
    expect(
      (await invoiceRouter.createCaller(ctx).listInvoices({ limit: null }))
        .map((invoice) => invoice.number)
        .sort()
    ).toEqual(['2025-001', '2026-001', '2026-002'])
    await expect(
      invoiceRouter
        .createCaller({ ...ctx, user: undefined })
        .listInvoices({ contactId: 'client', limit: null })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
