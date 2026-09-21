import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import * as schema from 'faktorio-db/schema'
import { invoiceRouter } from './invoiceRouter'
import type { TrpcContext } from '../../trpcContext'
import { invoiceEmailTemplate } from 'faktorio-shared/src/invoiceEmail'

let client: Client
let ctx: TrpcContext
const sendEmail = vi.fn<TrpcContext['sendEmail']>()
const input = {
  invoiceId: 'invoice-1',
  kind: 'invoice' as const,
  language: 'en' as const,
  to: 'chosen@example.com',
  subject: 'Custom subject',
  body: 'Hello <client> & team!\nPlease pay.'
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: '../faktorio-db/drizzle' })
  const [user] = await db
    .insert(schema.userT)
    .values({ id: 'owner', email: 'owner@example.com', name: 'Owner' })
    .returning()
  await db
    .insert(schema.contactTb)
    .values({
      id: 'contact-1',
      user_id: user.id,
      name: 'Client',
      language: 'en',
      main_email: 'contact@example.com'
    })
  await db.insert(schema.invoicesTb).values({
    id: 'invoice-1',
    user_id: user.id,
    client_contact_id: 'contact-1',
    number: '2026-001',
    language: 'cs',
    your_name: 'Seller',
    your_street: '',
    your_city: '',
    your_zip: '',
    your_country: 'CZ',
    your_registration_no: '',
    your_vat_no: '',
    client_name: 'Client',
    client_street: '',
    client_city: '',
    issued_on: '2026-09-01',
    taxable_fulfillment_due: '2026-09-01',
    due_on: '2026-09-15',
    due_in_days: 14,
    payment_method: 'bank',
    currency: 'CZK',
    total: 100,
    native_subtotal: 100
  })
  sendEmail.mockReset().mockResolvedValue(undefined)
  ctx = {
    db,
    user,
    env: { PUBLIC_APP_URL: 'https://app.example.com' } as TrpcContext['env'],
    req: new Request('https://untrusted.example.com'),
    sendEmail,
    generateToken: vi.fn()
  }
})

afterEach(() => client.close())

describe('invoice email', () => {
  it('prefills from the contact language and address, without creating a public share', async () => {
    const draft = await invoiceRouter
      .createCaller(ctx)
      .getEmailDraft({ invoiceId: 'invoice-1', kind: 'invoice' })
    expect(draft).toMatchObject({
      to: 'contact@example.com',
      language: 'en',
      number: '2026-001',
      senderName: 'Seller'
    })
    expect(invoiceEmailTemplate(draft, draft.language, 'invoice').subject).toBe(
      'Invoice 2026-001'
    )
    expect(await ctx.db.query.invoiceShareTb.findMany()).toHaveLength(0)
  })

  it('sends edited content with a working share, escapes HTML and only changes the sent date', async () => {
    await invoiceRouter.createCaller(ctx).sendEmail(input)
    const [share] = await ctx.db.query.invoiceShareTb.findMany()
    expect(share).toMatchObject({
      invoice_id: 'invoice-1',
      user_id: 'owner',
      disabled_at: null
    })
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: { email: 'chosen@example.com', name: 'Client' },
        subject: input.subject,
        replyTo: { email: 'owner@example.com', name: 'Seller' },
        text: `${input.body}\n\nView and download invoice: https://app.example.com/shared-invoice/${share.id}`
      })
    )
    expect(sendEmail.mock.calls[0][0].html).toContain(
      'Hello &lt;client&gt; &amp; team!<br>Please pay.'
    )
    const invoice = await ctx.db.query.invoicesTb.findFirst()
    expect(invoice).toMatchObject({ language: 'cs', reminder_sent_at: null })
    expect(invoice?.sent_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((await ctx.db.query.contactTb.findFirst())?.language).toBe('en')
  })

  it('records reminders separately and uses the selected email language', async () => {
    await invoiceRouter
      .createCaller(ctx)
      .sendEmail({ ...input, kind: 'reminder', language: 'cs' })
    expect(sendEmail.mock.calls[0][0].text).toContain(
      'Zobrazit a stáhnout fakturu:'
    )
    const invoice = await ctx.db.query.invoicesTb.findFirst()
    expect(invoice?.reminder_sent_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(invoice?.sent_at).toBeNull()
  })

  it('does not mark failed emails sent and removes their unused public share', async () => {
    sendEmail.mockRejectedValue(new Error('Provider failure'))
    await expect(
      invoiceRouter.createCaller(ctx).sendEmail(input)
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    expect(await ctx.db.query.invoiceShareTb.findMany()).toHaveLength(0)
    expect(await ctx.db.query.invoicesTb.findFirst()).toMatchObject({
      sent_at: null,
      reminder_sent_at: null
    })
  })

  it('rejects access to another user’s invoice before creating shares or sending', async () => {
    const caller = invoiceRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, id: 'someone-else' }
    })
    await expect(
      caller.getEmailDraft({ invoiceId: 'invoice-1', kind: 'invoice' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(caller.sendEmail(input)).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(await ctx.db.query.invoiceShareTb.findMany()).toHaveLength(0)
  })

  it('requires authentication', async () => {
    await expect(
      invoiceRouter.createCaller({ ...ctx, user: undefined }).sendEmail(input)
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects paid reminders and cancelled invoices', async () => {
    await ctx.db
      .update(schema.invoicesTb)
      .set({ paid_on: '2026-09-10' })
      .where(eq(schema.invoicesTb.id, 'invoice-1'))
    await expect(
      invoiceRouter.createCaller(ctx).sendEmail({ ...input, kind: 'reminder' })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await ctx.db.update(schema.invoicesTb).set({ cancelled_at: '2026-09-11' })
    await expect(
      invoiceRouter.createCaller(ctx).sendEmail(input)
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    { to: 'invalid' },
    { subject: 'Hello\r\nBcc: other@example.com' },
    { body: '   ' }
  ])('rejects invalid email input %j', async (invalid) => {
    await expect(
      invoiceRouter.createCaller(ctx).sendEmail({ ...input, ...invalid })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
