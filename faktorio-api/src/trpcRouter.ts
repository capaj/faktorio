import { trpcContext } from './trpcContext'
import { invoiceRouter } from './routers/invoices/invoiceRouter'
import { contactRouter } from './routers/contactRouter'
import { protectedProc } from './isAuthorizedMiddleware'
import { userInvoicingDetailsTb } from './schema'
import { conflictUpdateSetAll } from './drizzle-utils/conflictUpdateSet'
import { eq } from 'drizzle-orm'

import { receivedInvoicesRouter } from './routers/receivedInvoicesRouter'
import { authRouter } from './routers/authRouter'
import { pushNotificationRouter } from './routers/pushNotificationRouter'
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
  push: pushNotificationRouter,
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
    })
})

export type AppRouter = typeof appRouter
