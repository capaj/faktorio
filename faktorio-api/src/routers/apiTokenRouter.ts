import { z } from 'zod/v4'
import { trpcContext } from '../trpcContext'
import { protectedProc } from '../isAuthorizedMiddleware'
import { desc, and, eq } from 'drizzle-orm'
import { userApiTokensTb } from 'faktorio-db/schema'

export const apiTokenRouter = trpcContext.router({
  list: protectedProc.query(async ({ ctx }) => {
    const rows = await ctx.db.query.userApiTokensTb
      .findMany({
        where: eq(userApiTokensTb.user_id, ctx.user.id),
        orderBy: desc(userApiTokensTb.created_at)
      })
      .execute()

    return rows
  }),
  create: protectedProc.mutation(async ({ ctx }) => {
    const [inserted] = await ctx.db
      .insert(userApiTokensTb)
      .values({ user_id: ctx.user.id })
      .returning({
        token: userApiTokensTb.token,
        created_at: userApiTokensTb.created_at
      })
      .execute()

    return inserted
  }),
  delete: protectedProc
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userApiTokensTb)
        .where(
          and(
            eq(userApiTokensTb.token, input.token),
            eq(userApiTokensTb.user_id, ctx.user.id)
          )
        )
        .execute()
    })
})
