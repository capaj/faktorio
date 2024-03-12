import { z } from 'zod'
import { contactTb } from '../schema'
import { trpcContext } from '../trpcContext'
import { eq } from 'drizzle-orm'
import { contactCreateFormSchema } from './contactCreateFormSchema'
import { protectedProc } from '../isAuthorizedMiddleware'
import { contactInsertSchema } from '../zodDbSchemas'

export const contactRouter = trpcContext.router({
  all: protectedProc
    .input(z.string().nullish())
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.contactTb.findMany({
        where: eq(contactTb.user_id, ctx.userId)
      })
    }),
  byId: protectedProc.input(z.string()).query(async ({ input, ctx }) => {
    return await ctx.db.query.contactTb.findFirst({
      where: eq(contactTb.id, input)
    })
  }),

  update: protectedProc
    .input(contactInsertSchema.omit({
      user_id: true,
    }).extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contact = await ctx.db
        .update(contactTb)
        .set(input)
        .where(eq(contactTb.id, input.id))
        .execute()

      return contact
    }),

  create: protectedProc
    .input(contactCreateFormSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await ctx.db
        .insert(contactTb)
        .values({
          ...input,
          user_id: ctx.userId
        })
        .execute()

      return contact
    })
})
