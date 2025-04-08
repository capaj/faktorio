import { z } from 'zod'
import { contactTb, invoicesTb } from '../schema'
import { trpcContext } from '../trpcContext'
import { and, asc, count, desc, eq, like } from 'drizzle-orm'
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
  getInvoiceCount: protectedProc
    .input(
      z.object({
        contactId: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      // First check if the contact belongs to the user
      const contact = await ctx.db.query.contactTb.findFirst({
        where: and(
          eq(contactTb.id, input.contactId),
          eq(contactTb.user_id, ctx.user.id)
        )
      })

      if (!contact) {
        throw new Error('Contact not found')
      }

      // Count invoices for this contact
      const result = await ctx.db
        .select({ count: count() })
        .from(invoicesTb)
        .where(
          and(
            eq(invoicesTb.client_contact_id, input.contactId),
            eq(invoicesTb.user_id, ctx.user.id)
          )
        )
        .execute()

      return result[0]?.count || 0
    }),
  deleteWithInvoices: protectedProc
    .input(
      z.object({
        contactId: z.string(),
        deleteInvoices: z.boolean()
      })
    )
    .mutation(async ({ input, ctx }) => {
      // First check if the contact belongs to the user
      const contact = await ctx.db.query.contactTb.findFirst({
        where: and(
          eq(contactTb.id, input.contactId),
          eq(contactTb.user_id, ctx.user.id)
        )
      })

      if (!contact) {
        throw new Error('Contact not found')
      }

      // If deleteInvoices is true, delete all invoices for this contact
      if (input.deleteInvoices) {
        await ctx.db
          .delete(invoicesTb)
          .where(
            and(
              eq(invoicesTb.client_contact_id, input.contactId),
              eq(invoicesTb.user_id, ctx.user.id)
            )
          )
          .execute()
      }

      // Delete the contact
      await ctx.db
        .delete(contactTb)
        .where(
          and(
            eq(contactTb.id, input.contactId),
            eq(contactTb.user_id, ctx.user.id)
          )
        )
        .execute()
    }),
  delete: protectedProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await ctx.db
      .delete(contactTb)
      .where(and(eq(contactTb.id, input), eq(contactTb.user_id, ctx.user.id)))
      .execute()
  })
})
