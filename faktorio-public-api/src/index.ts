import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { createClient, type Client as LibsqlClient } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import {
  invoicesTb,
  userApiTokensTb,
  invoiceItemsTb,
  invoiceShareTb,
  invoiceShareEventTb
} from 'faktorio-db/schema'
import { eq, sql, and, gte, lte } from 'drizzle-orm'

let dbInstance: LibSQLDatabase | undefined

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
        async ({ set, query }) => {
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

    return app.fetch(request)
  }
} satisfies ExportedHandler<WorkerEnv>
