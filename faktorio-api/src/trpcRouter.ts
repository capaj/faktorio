import { tc } from './trpcContext'
import { invoiceRouter } from './routers/invoices/invoiceRouter'
import { contactRouter } from './routers/contactRouter'
import { protectedProc } from './isAuthorizedMiddleware'
import { userInvoicingDetailsTb } from './schema'
import { conflictUpdateSetAll } from './drizzle-utils/conflictUpdateSet'
import { eq } from 'drizzle-orm'
import { upsertInvoicingDetailsSchema } from '../../faktorio-fe/src/pages/MyDetails'

export const appRouter = tc.router({
  test: tc.procedure.query(async ({ ctx }) => {
    return 'test ' + new Date()
  }),
  invoices: invoiceRouter,
  contacts: contactRouter,
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
    })
})

export type AppRouter = typeof appRouter
