import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import * as schema from 'faktorio-db/schema'
import { invoiceRouter } from './invoiceRouter'
import type { TrpcContext } from '../../trpcContext'

let client: Client
let ctx: TrpcContext
const invoiceInput = {
  number: '2026-001',
  client_contact_id: 'contact-1',
  due_in_days: 14,
  issued_on: '2026-10-01',
  taxable_fulfillment_due: '2026-10-01'
}
const items = [{ description: 'Service', quantity: 1, unit_price: 100 }]

beforeEach(async () => {
  client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: '../faktorio-db/drizzle' })
  const [user] = await db
    .insert(schema.userT)
    .values({ id: 'owner', email: 'owner@example.com', name: 'Owner' })
    .returning()
  await db.insert(schema.userInvoicingDetailsTb).values({
    user_id: user.id,
    name: 'Seller',
    street: '',
    city: '',
    zip: '',
    country: 'CZ'
  })
  await db.insert(schema.contactTb).values({
    id: 'contact-1',
    user_id: user.id,
    name: 'Client',
    language: 'en'
  })
  ctx = {
    db,
    user,
    env: {} as TrpcContext['env'],
    req: new Request('https://app.example.com'),
    sendEmail: vi.fn(),
    generateToken: vi.fn()
  }
})

afterEach(() => client.close())

describe('invoice language', () => {
  it('saves the English language sent by the new invoice form', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({
      invoice: { ...invoiceInput, language: 'en' },
      items
    })

    expect(await caller.getById({ id })).toMatchObject({ language: 'en' })
  })

  it.each(['en', 'cs'])(
    'inherits the contact language (%s) when no invoice language is supplied',
    async (language) => {
      await ctx.db
        .update(schema.contactTb)
        .set({ language })
        .where(eq(schema.contactTb.id, 'contact-1'))
      const caller = invoiceRouter.createCaller(ctx)
      const id = await caller.create({ invoice: invoiceInput, items })

      expect(await caller.getById({ id })).toMatchObject({ language })
    }
  )

  it('keeps an explicit invoice language instead of the contact default', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({
      invoice: { ...invoiceInput, language: 'cs' },
      items
    })

    expect(await caller.getById({ id })).toMatchObject({ language: 'cs' })
  })

  it('saves language changes when editing an invoice', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({
      invoice: { ...invoiceInput, language: 'cs' },
      items
    })
    await caller.update({
      id,
      invoice: { ...invoiceInput, language: 'en' },
      items
    })

    expect(await caller.getById({ id })).toMatchObject({ language: 'en' })
  })

  it('preserves the saved language when an edit omits it', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({
      invoice: { ...invoiceInput, language: 'en' },
      items
    })
    await caller.update({ id, invoice: invoiceInput, items })

    expect(await caller.getById({ id })).toMatchObject({ language: 'en' })
  })
})
