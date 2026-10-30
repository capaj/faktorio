import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from 'faktorio-db/schema'
import { invoiceRouter } from './invoiceRouter'
import type { TrpcContext } from '../../trpcContext'

let client: Client
let ctx: TrpcContext
const data = {
  invoice: {
    currency: 'EUR',
    language: 'en',
    due_in_days: 30,
    client_contact_id: 'client',
    payment_method: 'bank' as const,
    footer_note: 'Issued {{date}}',
    bank_account: null,
    iban: 'CZ6508000000192000145399',
    swift_bic: null
  },
  items: [
    {
      description: 'Services {{previousMonth}}',
      quantity: 1,
      unit_price: 100,
      vat_rate: 0,
      order: 0
    }
  ]
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: '../faktorio-db/drizzle' })
  const [user] = await db
    .insert(schema.userT)
    .values({ id: 'owner', email: 'owner@example.test', name: 'Owner' })
    .returning()
  await db
    .insert(schema.contactTb)
    .values({ id: 'client', user_id: user.id, name: 'Client' })
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

describe('invoice templates', () => {
  it('round-trips reusable fields and discards the source number, dates, rate and item IDs', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const legacyData = {
      invoice: {
        ...data.invoice,
        number: '2025-001',
        issued_on: '2025-01-01',
        taxable_fulfillment_due: '2025-01-01',
        exchange_rate: 25
      },
      items: [{ ...data.items[0], id: 99, invoice_id: 'source' }]
    }
    await caller.saveTemplateFromInvoice({
      name: ' Monthly services ',
      data: legacyData
    })

    const templates = await caller.listTemplates()
    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      name: 'Monthly services',
      user_id: ctx.user!.id,
      data
    })
    expect(templates[0].data.invoice).not.toHaveProperty('number')
    expect(templates[0].data.invoice).not.toHaveProperty('issued_on')
    expect(templates[0].data.invoice).not.toHaveProperty(
      'taxable_fulfillment_due'
    )
    expect(templates[0].data.invoice).not.toHaveProperty('exchange_rate')
    expect(templates[0].data.items[0]).not.toHaveProperty('id')
  })

  it('updates a template of the same trimmed name without adding a duplicate', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    const template = await caller.saveTemplateFromInvoice({
      name: 'Monthly',
      data
    })
    await caller.saveTemplateFromInvoice({
      name: ' Monthly ',
      data: { ...data, invoice: { ...data.invoice, due_in_days: 7 } }
    })
    expect(await caller.listTemplates()).toMatchObject([
      {
        id: template.id,
        name: 'Monthly',
        data: { invoice: { due_in_days: 7 } }
      }
    ])
    expect(await caller.listTemplates()).toHaveLength(1)
  })

  it('allows nullable numeric item fields without coercing them to zero', async () => {
    const caller = invoiceRouter.createCaller(ctx)
    await caller.saveTemplateFromInvoice({
      name: 'Nullable items',
      data: {
        ...data,
        items: [
          {
            description: null,
            quantity: null,
            unit_price: null,
            vat_rate: null,
            unit: null
          }
        ]
      }
    })
    expect((await caller.listTemplates())[0].data.items[0]).toEqual({
      description: null,
      quantity: null,
      unit_price: null,
      vat_rate: null,
      unit: null
    })
  })

  it.each(['', '   ', 'a'.repeat(201)])(
    'rejects an invalid name',
    async (name) => {
      await expect(
        invoiceRouter.createCaller(ctx).saveTemplateFromInvoice({ name, data })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    }
  )

  it('isolates templates and same-name updates between users', async () => {
    const [other] = await ctx.db
      .insert(schema.userT)
      .values({ id: 'other', email: 'other@example.test', name: 'Other' })
      .returning()
    const ownerCaller = invoiceRouter.createCaller(ctx)
    const otherCaller = invoiceRouter.createCaller({ ...ctx, user: other })
    await ownerCaller.saveTemplateFromInvoice({ name: 'Monthly', data })
    expect(await otherCaller.listTemplates()).toEqual([])
    await expect(
      otherCaller.saveTemplateFromInvoice({ name: 'Monthly', data })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await otherCaller.saveTemplateFromInvoice({
      name: 'Monthly',
      data: {
        ...data,
        invoice: {
          ...data.invoice,
          client_contact_id: undefined,
          currency: 'CZK'
        }
      }
    })
    expect((await ownerCaller.listTemplates())[0].data.invoice.currency).toBe(
      'EUR'
    )
    expect((await otherCaller.listTemplates())[0].data.invoice.currency).toBe(
      'CZK'
    )
  })

  it('requires authentication for saving and listing templates', async () => {
    const caller = invoiceRouter.createCaller({ ...ctx, user: undefined })
    await expect(caller.listTemplates()).rejects.toMatchObject({
      code: 'UNAUTHORIZED'
    })
    await expect(
      caller.saveTemplateFromInvoice({ name: 'Monthly', data })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
