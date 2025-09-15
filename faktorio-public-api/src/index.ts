import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { createClient, type Client as LibsqlClient } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import type { Static } from '@sinclair/typebox'
import { createSchemaFactory } from 'drizzle-typebox'
import {
  invoicesTb,
  userApiTokensTb,
  invoiceItemsTb,
  invoiceShareTb,
  invoiceShareEventTb,
  contactTb,
  userInvoicingDetailsTb,
  PaymentMethodType,
  receivedInvoiceTb
} from 'faktorio-db/schema'
import { eq, sql, and, gte, lte } from 'drizzle-orm'

let dbInstance: LibSQLDatabase | undefined

const { createInsertSchema, createUpdateSchema } = createSchemaFactory({
  typeboxInstance: t
})

type ReceivedInvoiceInsert = typeof receivedInvoiceTb.$inferInsert

const _paymentMethodSchema = t.Union([
  t.Literal('bank'),
  t.Literal('cash'),
  t.Literal('card'),
  t.Literal('cod'),
  t.Literal('crypto'),
  t.Literal('other')
])

const _receivedRowInsertSchema = createInsertSchema(receivedInvoiceTb)
const _receivedRowUpdateSchema = createUpdateSchema(receivedInvoiceTb)

const ReceivedInvoiceCreateSchema = _receivedRowInsertSchema

const ReceivedInvoiceUpdateSchema = _receivedRowUpdateSchema

type WorkerEnv = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN?: string
}

// Elysia App initialization is performed inside fetch to avoid disallowed global operations on Workers

export default {
  async fetch(request, env: WorkerEnv) {
    if (!dbInstance) {
      const client: LibsqlClient = createClient({
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN
      })
      dbInstance = drizzle(client)
    }

    const pathname = new URL(request.url).pathname
    const isDocRoute = ['/swagger', '/swagger/json'].includes(pathname)
    const isSharedInvoiceRoute = pathname.startsWith('/shared-invoice/')
    const apiKey =
      request.headers.get('X-API-KEY') ?? request.headers.get('x-api-key')
    if (!apiKey && !isDocRoute && !isSharedInvoiceRoute) {
      return new Response('Missing X-API-KEY', { status: 401 })
    }

    let tokenRow: { user_id: string }
    if (!isDocRoute && !isSharedInvoiceRoute) {
      const apiKeyVerified = apiKey!

      const tokenRows = await dbInstance!
        .select({ user_id: userApiTokensTb.user_id })
        .from(userApiTokensTb)
        .where(eq(userApiTokensTb.token, apiKeyVerified))
        .all()

      tokenRow = tokenRows[0]
      if (!tokenRow) {
        return new Response('Invalid API key', { status: 403 })
      }
    }

    const app = new Elysia({ aot: false })
      .use(cors())
      .onError(({ error, code: _code, path }) => {
        console.error(`Error in ${path}:`)
        console.error(error)
      })
      .use(
        swagger({
          path: '/swagger',
          documentation: {
            info: { title: 'Faktorio Public API', version: '1.0.0' },
            components: {
              securitySchemes: {
                ApiKeyAuth: {
                  type: 'apiKey',
                  in: 'header',
                  name: 'X-API-KEY'
                }
              }
            }
          }
        })
      )
      .post(
        '/invoices',
        async ({ body, set }) => {
          const input = body as {
            invoice: {
              number: string
              client_contact_id: string
              taxable_fulfillment_due: string
              issued_on: string
              due_in_days: number
              payment_method: PaymentMethodType
              currency: string
              exchange_rate?: number
              language?: string
              note?: string | null
            }
            items: Array<{
              description?: string
              quantity?: number
              unit_price?: number
              unit?: string
              vat_rate?: number
            }>
          }

          const [client] = await dbInstance!
            .select()
            .from(contactTb)
            .where(
              and(
                eq(contactTb.id, input.invoice.client_contact_id),
                eq(contactTb.user_id, tokenRow.user_id)
              )
            )
            .limit(1)
            .all()

          if (!client) {
            set.status = 400
            return 'Client not found'
          }

          const [user] = await dbInstance!
            .select()
            .from(userInvoicingDetailsTb)
            .where(eq(userInvoicingDetailsTb.user_id, tokenRow.user_id))
            .limit(1)
            .all()

          if (!user) {
            set.status = 400
            return 'User invoicing details not found'
          }

          const items = input.items ?? []
          const exRate = input.invoice.exchange_rate ?? 1
          let subtotal = 0
          let total = 0
          let vat_21 = 0
          let vat_12 = 0
          for (const it of items) {
            const qty = it.quantity ?? 0
            const price = it.unit_price ?? 0
            const line = qty * price
            subtotal += line
            const rate = it.vat_rate ?? 0
            const vat = (line * rate) / 100
            total += line + vat
            if (rate === 21) vat_21 += vat
            if (rate === 12) vat_12 += vat
          }

          const due_on = new Date(
            new Date(input.invoice.issued_on).getTime() +
              input.invoice.due_in_days * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10)

          const [created] = await dbInstance!
            .insert(invoicesTb)
            .values({
              number: input.invoice.number,
              your_name: user.name,
              your_street: user.street,
              your_street2: user.street2 ?? null,
              your_city: user.city,
              your_zip: user.zip,
              your_country: user.country,
              your_registration_no: user.registration_no ?? '',
              your_vat_no: user.vat_no ?? '',
              client_name: client.name,
              client_street: client.street ?? '',
              client_street2: client.street2 ?? null,
              client_city: client.city ?? '',
              client_zip: client.zip ?? null,
              client_country: client.country ?? null,
              client_registration_no: client.registration_no ?? null,
              client_vat_no: client.vat_no ?? null,
              status: 'issued',
              order_number: null,
              issued_on: input.invoice.issued_on,
              taxable_fulfillment_due: input.invoice.taxable_fulfillment_due,
              due_in_days: input.invoice.due_in_days,
              due_on,
              sent_at: null,
              paid_on: null,
              reminder_sent_at: null,
              cancelled_at: null,
              bank_account: user.bank_account ?? null,
              iban: user.iban ?? null,
              swift_bic: user.swift_bic ?? null,
              payment_method: input.invoice.payment_method,
              currency: input.invoice.currency,
              exchange_rate: exRate,
              language: (input.invoice.language as any) ?? 'cs',
              transferred_tax_liability: null,
              supply_code: null,
              subtotal: subtotal || null,
              total: total || 0,
              native_subtotal: (subtotal || 0) * exRate,
              native_total: total * exRate,
              remaining_amount: null,
              remaining_native_amount: null,
              paid_amount: 0,
              note: input.invoice.note ?? null,
              footer_note: null,
              tags: null,
              vat_base_21: vat_21 ? subtotal : null,
              vat_21: vat_21 || null,
              vat_base_15: null,
              vat_15: null,
              vat_base_12: vat_12 ? subtotal : null,
              vat_12: vat_12 || null,
              client_email: client.email ?? client.main_email ?? null,
              client_phone: client.phone ?? client.phone_number ?? null,
              client_contact_id: input.invoice.client_contact_id,
              user_id: tokenRow.user_id
            })
            .returning({ id: invoicesTb.id })
            .all()

          if (items.length) {
            await dbInstance!
              .insert(invoiceItemsTb)
              .values(
                items.map((it, idx) => ({
                  description: it.description ?? null,
                  quantity: it.quantity ?? null,
                  unit_price: it.unit_price ?? null,
                  unit: it.unit ?? null,
                  vat_rate: it.vat_rate ?? null,
                  order: idx,
                  invoice_id: created.id
                }))
              )
              .run()
          }

          set.status = 201
          return { id: created.id }
        },
        {
          detail: {
            tags: ['Invoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          body: t.Object({
            invoice: t.Object({
              number: t.String(),
              client_contact_id: t.String(),
              taxable_fulfillment_due: t.String(),
              issued_on: t.String(),
              due_in_days: t.Integer({ minimum: 0 }),
              payment_method: t.Union([
                t.Literal('bank'),
                t.Literal('cash'),
                t.Literal('card'),
                t.Literal('cod'),
                t.Literal('crypto'),
                t.Literal('other')
              ]),
              currency: t.String({ minLength: 3, maxLength: 3 }),
              exchange_rate: t.Optional(t.Number({ minimum: 0, default: 1 })),
              language: t.Optional(t.String()),
              note: t.Optional(t.String())
            }),
            items: t.Array(
              t.Object({
                description: t.Optional(t.String()),
                quantity: t.Optional(t.Number()),
                unit_price: t.Optional(t.Number()),
                unit: t.Optional(t.String()),
                vat_rate: t.Optional(t.Number())
              })
            )
          })
        }
      )
      .get(
        '/invoices/:id',
        async ({ params, set }) => {
          const { id } = params

          const invoiceRows = await dbInstance!
            .select()
            .from(invoicesTb)
            .where(
              and(
                eq(invoicesTb.id, id),
                eq(invoicesTb.user_id, tokenRow.user_id)
              )
            )
            .limit(1)
            .all()

          const invoice = invoiceRows[0]
          if (!invoice) {
            set.status = 404
            return 'Not found'
          }

          const items = await dbInstance!
            .select()
            .from(invoiceItemsTb)
            .where(eq(invoiceItemsTb.invoice_id, invoice.id))
            .all()

          return { invoice, items }
        },
        {
          detail: {
            tags: ['Invoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          params: t.Object({
            id: t.String()
          })
        }
      )
      .get('/', () => 'ok')
      // Public shared invoice fetch
      .get('/shared-invoice/:shareId', async ({ params, request }) => {
        const shareId = params.shareId
        // validate share exists and is active
        const [share] = await dbInstance!
          .select()
          .from(invoiceShareTb)
          .where(eq(invoiceShareTb.id, shareId))
          .limit(1)
          .all()

        if (!share) return new Response('Not found', { status: 404 })
        if (share.disabled_at)
          return new Response('Link disabled', { status: 410 })
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          return new Response('Link expired', { status: 410 })
        }

        const [invoice] = await dbInstance!
          .select()
          .from(invoicesTb)
          .where(eq(invoicesTb.id, share.invoice_id))
          .limit(1)
          .all()

        if (!invoice) return new Response('Not found', { status: 404 })

        const items = await dbInstance!
          .select()
          .from(invoiceItemsTb)
          .where(eq(invoiceItemsTb.invoice_id, invoice.id))
          .all()

        // track view event
        const ip =
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          ''
        const userAgent = request.headers.get('user-agent') || ''
        const referer = request.headers.get('referer') || ''
        const country = (request as any).cf?.country as string | undefined
        const url = new URL(request.url)

        await dbInstance!
          .insert(invoiceShareEventTb)
          .values({
            share_id: share.id,
            event_type: 'view',
            ip_address: ip,
            user_agent: userAgent,
            referer,
            country,
            path: url.pathname + url.search
          })
          .run()

        await dbInstance!
          .update(invoiceShareTb)
          .set({
            last_accessed_at: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(invoiceShareTb.id, share.id))
          .run()

        return new Response(JSON.stringify({ invoice, items, share }), {
          headers: {
            'content-type': 'application/json'
          }
        })
      })
      // Public event logging (e.g., download)
      .post(
        '/shared-invoice/:shareId/event',
        async ({ params, request, body }) => {
          const shareId = params.shareId
          const type = body?.type ?? 'view'

          const [share] = await dbInstance!
            .select()
            .from(invoiceShareTb)
            .where(eq(invoiceShareTb.id, shareId))
            .limit(1)
            .all()
          if (!share) return new Response('Not found', { status: 404 })
          if (share.disabled_at)
            return new Response('Link disabled', { status: 410 })

          const ip =
            request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            ''
          const userAgent = request.headers.get('user-agent') || ''
          const referer = request.headers.get('referer') || ''
          const country = (request as any).cf?.country as string | undefined
          const url = new URL(request.url)

          await dbInstance!
            .insert(invoiceShareEventTb)
            .values({
              share_id: share.id,
              event_type: type,
              ip_address: ip,
              user_agent: userAgent,
              referer,
              country,
              path: url.pathname + url.search
            })
            .run()

          if (type === 'download') {
            await dbInstance!
              .update(invoiceShareTb)
              .set({
                last_accessed_at: sql`CURRENT_TIMESTAMP`
              })
              .where(eq(invoiceShareTb.id, share.id))
              .run()
          }
          return new Response(null, {
            status: 204
          })
        },
        {
          body: t.Object({
            type: t.Optional(
              t.Union([
                t.Literal('download'),
                t.Literal('copy'),
                t.Literal('view')
              ])
            )
          })
        }
      )
      .get(
        '/invoices',
        async ({ query }) => {
          const { limit = 100, offset = 0, from, to } = query

          const rows = await dbInstance!
            .select()
            .from(invoicesTb)
            .where(
              and(
                eq(invoicesTb.user_id, tokenRow.user_id),
                from
                  ? gte(invoicesTb.taxable_fulfillment_due, from)
                  : undefined,
                to ? lte(invoicesTb.taxable_fulfillment_due, to) : undefined
              )
            )
            .limit(limit)
            .offset(offset)
            .all()

          return { invoices: rows }
        },
        {
          detail: {
            tags: ['Invoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          query: t.Object({
            limit: t.Optional(
              t.Integer({ minimum: 1, maximum: 5000, default: 100 })
            ),
            offset: t.Optional(t.Integer({ minimum: 0, default: 0 })),
            from: t.Optional(t.String()),
            to: t.Optional(t.String())
          })
        }
      )
      .post(
        '/received-invoices',
        async ({ body, set }) => {
          const input = body as Static<typeof ReceivedInvoiceCreateSchema>

          if (input.supplier_contact_id) {
            const [supplier] = await dbInstance!
              .select({ id: contactTb.id })
              .from(contactTb)
              .where(
                and(
                  eq(contactTb.id, input.supplier_contact_id),
                  eq(contactTb.user_id, tokenRow.user_id)
                )
              )
              .limit(1)
              .all()
            if (!supplier) {
              set.status = 400
              return 'Supplier not found'
            }
          }

          const values: ReceivedInvoiceInsert = {
            ...input,
            payment_method: (input.payment_method ??
              'bank') as PaymentMethodType,
            user_id: tokenRow.user_id
          }

          const [created] = await dbInstance!
            .insert(receivedInvoiceTb)
            .values(values)
            .returning({ id: receivedInvoiceTb.id })
            .all()

          set.status = 201
          return { id: created.id }
        },
        {
          detail: {
            tags: ['ReceivedInvoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          body: ReceivedInvoiceCreateSchema as any
        }
      )
      .get(
        '/received-invoices/:id',
        async ({ params, set }) => {
          const { id } = params

          const rows = await dbInstance!
            .select()
            .from(receivedInvoiceTb)
            .where(
              and(
                eq(receivedInvoiceTb.id, id),
                eq(receivedInvoiceTb.user_id, tokenRow.user_id)
              )
            )
            .limit(1)
            .all()

          const invoice = rows[0]
          if (!invoice) {
            set.status = 404
            return 'Not found'
          }
          return { invoice }
        },
        {
          detail: {
            tags: ['ReceivedInvoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          params: t.Object({ id: t.String() })
        }
      )
      .get(
        '/received-invoices',
        async ({ query }) => {
          const { limit = 100, offset = 0, from, to } = query

          const rows = await dbInstance!
            .select()
            .from(receivedInvoiceTb)
            .where(
              and(
                eq(receivedInvoiceTb.user_id, tokenRow.user_id),
                from
                  ? gte(receivedInvoiceTb.taxable_supply_date, from)
                  : undefined,
                to ? lte(receivedInvoiceTb.taxable_supply_date, to) : undefined
              )
            )
            .limit(limit)
            .offset(offset)
            .all()

          return { invoices: rows }
        },
        {
          detail: {
            tags: ['ReceivedInvoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          query: t.Object({
            limit: t.Optional(
              t.Integer({ minimum: 1, maximum: 5000, default: 100 })
            ),
            offset: t.Optional(t.Integer({ minimum: 0, default: 0 })),
            from: t.Optional(t.String()),
            to: t.Optional(t.String())
          })
        }
      )
      .patch(
        '/received-invoices/:id',
        async ({ params, body, set }) => {
          const { id } = params
          const updates = body as Static<typeof ReceivedInvoiceUpdateSchema>

          const [existing] = await dbInstance!
            .select({ id: receivedInvoiceTb.id })
            .from(receivedInvoiceTb)
            .where(
              and(
                eq(receivedInvoiceTb.id, id),
                eq(receivedInvoiceTb.user_id, tokenRow.user_id)
              )
            )
            .limit(1)
            .all()

          if (!existing) {
            set.status = 404
            return 'Not found'
          }

          const updatesCoerced = {
            ...updates,
            payment_method: updates.payment_method as
              | PaymentMethodType
              | null
              | undefined
          }

          await dbInstance!
            .update(receivedInvoiceTb)
            .set(updatesCoerced as any)
            .where(
              and(
                eq(receivedInvoiceTb.id, id),
                eq(receivedInvoiceTb.user_id, tokenRow.user_id)
              )
            )
            .run()

          return new Response(null, { status: 204 })
        },
        {
          detail: {
            tags: ['ReceivedInvoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          params: t.Object({ id: t.String() }),
          body: ReceivedInvoiceUpdateSchema as any
        }
      )
      .delete(
        '/received-invoices/:id',
        async ({ params, set }) => {
          const { id } = params

          const [row] = await dbInstance!
            .select({ id: receivedInvoiceTb.id })
            .from(receivedInvoiceTb)
            .where(
              and(
                eq(receivedInvoiceTb.id, id),
                eq(receivedInvoiceTb.user_id, tokenRow.user_id)
              )
            )
            .limit(1)
            .all()

          if (!row) {
            set.status = 404
            return 'Not found'
          }

          await dbInstance!
            .delete(receivedInvoiceTb)
            .where(
              and(
                eq(receivedInvoiceTb.id, id),
                eq(receivedInvoiceTb.user_id, tokenRow.user_id)
              )
            )
            .run()

          return new Response(null, { status: 204 })
        },
        {
          detail: {
            tags: ['ReceivedInvoices'],
            security: [{ ApiKeyAuth: [] }]
          },
          params: t.Object({ id: t.String() })
        }
      )

    return app.fetch(request)
  }
} satisfies ExportedHandler<WorkerEnv>
