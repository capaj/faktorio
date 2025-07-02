import { z } from 'zod'
import { protectedProc, t } from '../trpcRouter'
import { pushSubscriptionTb, invoicesTb } from '../schema'
import { eq, and, lte, isNull } from 'drizzle-orm'
import { djs } from 'faktorio-shared/src/djs'

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
})

export const pushNotificationRouter = t.router({
  subscribe: protectedProc
    .input(pushSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .insert(pushSubscriptionTb)
        .values({
          user_id: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth
        })
        .onConflictDoUpdate({
          target: pushSubscriptionTb.endpoint,
          set: {
            p256dh: input.keys.p256dh,
            auth: input.keys.auth,
            updated_at: new Date().toISOString()
          }
        })

      return { success: true }
    }),

  unsubscribe: protectedProc
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(pushSubscriptionTb)
        .where(
          and(
            eq(pushSubscriptionTb.user_id, ctx.user.id),
            eq(pushSubscriptionTb.endpoint, input.endpoint)
          )
        )

      return { success: true }
    }),

  getUserSubscriptions: protectedProc.query(async ({ ctx }) => {
    const subscriptions = await ctx.db
      .select()
      .from(pushSubscriptionTb)
      .where(eq(pushSubscriptionTb.user_id, ctx.user.id))

    return subscriptions
  }),

  checkDueInvoices: protectedProc.query(async ({ ctx }) => {
    const today = djs().format('YYYY-MM-DD')
    const tomorrow = djs().add(1, 'day').format('YYYY-MM-DD')

    const dueInvoices = await ctx.db
      .select({
        id: invoicesTb.id,
        number: invoicesTb.number,
        client_name: invoicesTb.client_name,
        due_on: invoicesTb.due_on,
        total: invoicesTb.total,
        currency: invoicesTb.currency
      })
      .from(invoicesTb)
      .where(
        and(
          eq(invoicesTb.user_id, ctx.user.id),
          lte(invoicesTb.due_on, tomorrow),
          isNull(invoicesTb.paid_on),
          isNull(invoicesTb.cancelled_at)
        )
      )

    return dueInvoices
  })
}) 