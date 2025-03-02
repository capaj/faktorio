import { z } from 'zod'
import { contactTb } from '../schema'
import { trpcContext } from '../trpcContext'
import { and, asc, desc, eq, like } from 'drizzle-orm'
import { contactCreateFormSchema } from './contactCreateFormSchema'
import { protectedProc } from '../isAuthorizedMiddleware'
import { contactInsertSchema } from '../zodDbSchemas'

export const contactRouter = trpcContext.router({
  all: protectedProc
    .input(
      z
        .object({
          search: z.string().optional()
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.contactTb.findMany({
        where: and(
          eq(contactTb.user_id, ctx.user.id),
          like(contactTb.name, `%${input?.search ?? ''}%`)
        ),
        orderBy: [desc(contactTb.created_at)]
      })
    }),
  byId: protectedProc.input(z.string()).query(async ({ input, ctx }) => {
    return await ctx.db.query.contactTb.findFirst({
      where: and(eq(contactTb.id, input), eq(contactTb.user_id, ctx.user.id))
    })
  }),

  update: protectedProc
    .input(
      contactInsertSchema
        .omit({
          user_id: true
        })
        .extend({ id: z.string() })
    )
    .mutation(async ({ input, ctx }) => {
      const contact = await ctx.db
        .update(contactTb)
        .set(input)
        .where(
          and(eq(contactTb.id, input.id), eq(contactTb.user_id, ctx.user.id))
        )
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
          user_id: ctx.user.id
        })
        .execute()

      return contact
    }),
  createMany: protectedProc
    .input(z.array(contactCreateFormSchema))
    .mutation(async ({ input, ctx }) => {
      const contacts = await ctx.db
        .insert(contactTb)
        .values(
          input.map((contact) => ({
            ...contact,
            user_id: ctx.user.id
          }))
        )
        .execute()

      return contacts
    }),
  delete: protectedProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await ctx.db
      .delete(contactTb)
      .where(and(eq(contactTb.id, input), eq(contactTb.user_id, ctx.user.id)))
      .execute()
  })
})
