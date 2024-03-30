import { trpcContext } from './trpcContext'
import { invoiceRouter } from './routers/invoices/invoiceRouter'
import { contactRouter } from './routers/contactRouter'
import { protectedProc } from './isAuthorizedMiddleware'
import { userInvoicingDetailsInsertSchema } from './zodDbSchemas'
import { userInvoicingDetailsTb } from './schema'
import { conflictUpdateSetAll } from './drizzle-utils/aa'
import { eq } from 'drizzle-orm'
import { upsertInvoicingDetailsSchema } from '../../faktorio-fe/src/pages/MyDetails'

export const appRouter = trpcContext.router({
  invoices: invoiceRouter,
  contacts: contactRouter,
  invoicingDetails: protectedProc.query(async ({ ctx }) => {
    const res = await ctx.db.query.userInvoicingDetailsTb
      .findFirst({
        where: eq(userInvoicingDetailsTb.user_id, ctx.userId)
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
          user_id: ctx.userId
        })
        .onConflictDoUpdate({
          target: [userInvoicingDetailsTb.user_id],
          set: conflictUpdateSetAll(userInvoicingDetailsTb)
        })
    })
})

export type AppRouter = typeof appRouter
