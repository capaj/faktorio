import { trpcContext } from './trpcContext'
import { invoiceRouter } from './routers/invoices/invoiceRouter'
import { contactRouter } from './routers/contactRouter'
import { protectedProc } from './isAuthorizedMiddleware'
import {
  userInvoicingDetailsTb,
  systemStatsTb,
  invoiceShareEventTb,
  SharedInvoiceEventType
} from 'faktorio-db/schema'
import { conflictUpdateSetAll } from './drizzle-utils/conflictUpdateSet'
import { eq, desc } from 'drizzle-orm'

import { receivedInvoicesRouter } from './routers/receivedInvoicesRouter'
import { authRouter } from './routers/authRouter'
import { pushNotificationRouter } from './routers/pushNotificationRouter'
import { apiTokenRouter } from './routers/apiTokenRouter'
import { userInvoicingDetailsInsertSchema } from './zodDbSchemas'
import { z } from 'zod/v4'

export const upsertInvoicingDetailsSchema = z
  .object({
    registration_no: z.string().min(8).max(8).optional() // this forces the input to be first in AutoForm
  })
  .merge(
    userInvoicingDetailsInsertSchema.omit({
      created_at: true,
      updated_at: true,
      user_id: true,
      registration_no: true
    })
  )

export const appRouter = trpcContext.router({
  test: trpcContext.procedure.query(async ({ ctx }) => {
    return 'test ' + new Date()
  }),
  auth: authRouter,
  invoices: invoiceRouter,
  contacts: contactRouter,
  receivedInvoices: receivedInvoicesRouter,
  apiTokens: apiTokenRouter,
  webPushNotifications: pushNotificationRouter,
  systemStats: trpcContext.procedure.query(async ({ ctx }) => {
    const latestStats = await ctx.db.query.systemStatsTb.findFirst({
      orderBy: desc(systemStatsTb.calculated_at)
    })

    return latestStats ?? { user_count: 0, invoice_count: 0 }
  }),
  invoicingDetails: protectedProc.query(async ({ ctx }) => {
    const res = await ctx.db.query.userInvoicingDetailsTb
      .findFirst({
        where: eq(userInvoicingDetailsTb.user_id, ctx.user.id)
      })
      .execute()

    return res ?? null // Drizzle ORM returns undefined if no record is found which is not allowed by trpc
  }),
  upsertInvoicingDetails: protectedProc
    .input(upsertInvoicingDetailsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userInvoicingDetailsTb)
        .values({
          ...input,
          user_id: ctx.user.id
        })
        .onConflictDoUpdate({
          target: [userInvoicingDetailsTb.user_id],
          set: conflictUpdateSetAll(userInvoicingDetailsTb)
        })

      console.log('upserted invoicing details', input)
    }),
  sharedInvoiceEvent: trpcContext.procedure
    .input(z.object({ shareId: z.string(), type: SharedInvoiceEventType }))
    .mutation(async ({ ctx, input }) => {
      const { shareId, type } = input
      const agent = ctx.req.headers.get('user-agent') ?? ''
      const ip = ctx.req.headers.get('cf-connecting-ip') ?? ''
      const country = ctx.req.headers.get('cf-ipcountry') ?? ''
      const referer = ctx.req.headers.get('referer') ?? ''
      const path = ctx.req.url ?? ''
      await ctx.db
        .insert(invoiceShareEventTb)
        .values({
          share_id: shareId,
          event_type: type,
          ip_address: ip,
          user_agent: agent,
          referer,
          path
        })
    })
})

export type AppRouter = typeof appRouter
