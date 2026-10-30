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
  number: '2026-002',
  client_contact_id: 'client',
  due_in_days: 14,
  issued_on: '2026-10-01',
  taxable_fulfillment_due: '2026-10-01'
}
const items = [{ description: 'Service', quantity: 1, unit_price: 100 }]
const defaultBankDetails = {
  bank_account: '111111/0100',
  iban: 'CZ6501000000000000111111',
  swift_bic: 'KOMBCZPP'
}
const invoiceBankDetails = {
  bank_account: '222222/0800',
  iban: 'CZ6508000000000000222222',
  swift_bic: 'GIBACZPX'
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: '../faktorio-db/drizzle' })
  const [user] = await db
    .insert(schema.userT)
    .values({ id: 'owner', email: 'owner@example.test', name: 'Owner' })
    .returning()
  await db.insert(schema.userBankAccountsTb).values([
    { id: 'default', user_id: user.id, ...defaultBankDetails },
    { id: 'euro', user_id: user.id, ...invoiceBankDetails, order: 1 }
  ])
  await db.insert(schema.userInvoicingDetailsTb).values({
    user_id: user.id,
    name: 'Seller',
    street: '',
    city: '',
    zip: '',
    country: 'CZ',
    default_bank_account_id: 'default'
  })
  await db.insert(schema.contactTb).values({
    id: 'client',
    user_id: user.id,
    name: 'Client',
    currency: 'CZK'
  })
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

describe('invoice payment settings', () => {
  it('preserves the source currency and bank details when creating a duplicate', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const sourceId = await caller.create({
      invoice: { ...invoiceInput, number: '2026-001' },
      items
    })
    // The source can retain an account that is no longer the default.
    await ctx.db
      .update(schema.invoicesTb)
      .set({ currency: 'EUR', ...invoiceBankDetails })
      .where(eq(schema.invoicesTb.id, sourceId))
    const source = await caller.getById({ id: sourceId })
    const id = await caller.create({
      invoice: { ...source, number: invoiceInput.number },
      items
    })

    expect(await caller.getById({ id })).toMatchObject({
      currency: 'EUR',
      ...invoiceBankDetails
    })
  })

  it('preserves custom bank details that are not saved in the user profile', async () => {
    const bankDetails = {
      bank_account: '333333/0300',
      iban: 'CZ6503000000000000333333',
      swift_bic: 'CEKOCZPP'
    }
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({
      invoice: { ...invoiceInput, ...bankDetails },
      items
    })

    expect(await caller.getById({ id })).toMatchObject(bankDetails)
  })

  it.each(['', null])(
    'keeps explicitly cleared bank details (%s)',
    async (value) => {
      const bankDetails = { bank_account: value, iban: value, swift_bic: value }
      const caller = invoiceRouter.createCaller(ctx)
      const id = await caller.create({
        invoice: { ...invoiceInput, ...bankDetails },
        items
      })

      expect(await caller.getById({ id })).toMatchObject(bankDetails)
    }
  )

  it('uses the default account when bank details are omitted', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const id = await caller.create({ invoice: invoiceInput, items })

    expect(await caller.getById({ id })).toMatchObject(defaultBankDetails)
  })
})
