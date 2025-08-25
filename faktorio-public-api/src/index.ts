/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { createClient, Client as LibsqlClient } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { invoicesTb, userApiTokensTb } from 'faktorio-db/schema'
import { eq } from 'drizzle-orm'

let dbInstance: LibSQLDatabase | undefined

type WorkerEnv = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN?: string
}

// App initialization is performed inside fetch to avoid disallowed global operations on Workers

export default {
  async fetch(request, env: WorkerEnv) {
    if (!dbInstance) {
      const client: LibsqlClient = createClient({
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN
      })
      dbInstance = drizzle(client)
    }

    const apiKey =
      request.headers.get('X-API-KEY') ?? request.headers.get('x-api-key')
    if (!apiKey) {
      return new Response('Missing X-API-KEY', { status: 401 })
    }

    const app = new Elysia({ aot: false })
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
      .get('/', () => 'ok')
      .get(
        '/invoices',
        async ({ request, set }) => {
          const url = new URL(request.url)
          const limitParam = url.searchParams.get('limit')
          const offsetParam = url.searchParams.get('offset')
          let limit = Number(limitParam)
          if (!Number.isFinite(limit) || limit <= 0) limit = 100
          if (limit > 5000) limit = 5000
          let offset = Number(offsetParam)
          if (!Number.isFinite(offset) || offset < 0) offset = 0

          const tokenRows = await dbInstance!
            .select({ user_id: userApiTokensTb.user_id })
            .from(userApiTokensTb)
            .where(eq(userApiTokensTb.token, apiKey))
            .all()

          const tokenRow = tokenRows[0]
          if (!tokenRow) {
            set.status = 403
            return { error: 'Invalid API key' }
          }

          const rows = await dbInstance!
            .select()
            .from(invoicesTb)
            .where(eq(invoicesTb.user_id, tokenRow.user_id))
            .limit(limit)
            .offset(offset)
            .all()

          return { invoices: rows }
        },
        {
          detail: {
            tags: ['Invoices'],
            security: [{ ApiKeyAuth: [] }]
          }
        }
      )

    return app.fetch(request)
  }
} satisfies ExportedHandler<WorkerEnv>
