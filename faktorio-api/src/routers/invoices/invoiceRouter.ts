import { z } from 'zod'
import {
  contactTb,
  invoiceItemsTb,
  invoicesTb,
  userInvoicingDetailsTb
} from '../../schema'
import { trpcContext } from '../../trpcContext'
import { asc, count, desc, eq } from 'drizzle-orm'
import { protectedProc } from '../../isAuthorizedMiddleware'
import { getInvoiceCreateSchema } from '../../../../faktorio-fe/src/pages/invoice/getInvoiceCreateSchema'
import { djs } from '../../../../src/djs'
import { invoiceItemFormSchema } from '../../zodDbSchemas'
import { getInvoiceSums } from './getInvoiceSums'

const invoiceSchema = getInvoiceCreateSchema(djs().format('YYYYMMDD') + '001')
export const invoiceRouter = trpcContext.router({
  create: protectedProc
    .input(
      z.object({
        invoice: invoiceSchema,
        items: z.array(invoiceItemFormSchema)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const invoiceItems = input.items
      const invoiceSums = getInvoiceSums(invoiceItems)

      if (input.invoice.currency !== 'CZK') {
        throw new Error('Currency not supported') // TODO add support for other currencies
      }
      const client = await ctx.db.query.contactTb
        .findFirst({
          where: eq(contactTb.id, input.invoice.client_contact_id)
        })
        .execute()

      const user = await ctx.db.query.userInvoicingDetailsTb
        .findFirst({
          where: eq(userInvoicingDetailsTb.user_id, ctx.userId)
        })
        .execute()

      if (!client) {
        throw new Error('Client not found')
      }

      if (!user) {
        throw new Error('User not found')
      }
      console.log('user:', user)

      return await ctx.db.transaction(async (tx) => {
        const [invoice] = await tx
          .insert(invoicesTb)
          .values({
            ...input.invoice,
            user_id: ctx.userId,
            due_on: djs(input.invoice.issued_on)
              .add(input.invoice.due_in_days, 'day')
              .format('YYYY-MM-DD'),
            taxable_fulfillment_due: djs(
              input.invoice.taxable_fulfillment_due
            ).format('YYYY-MM-DD'),
            issued_on: djs(input.invoice.issued_on).format('YYYY-MM-DD'),
            client_contact_id: input.invoice.client_contact_id,
            ...invoiceSums,

            // user
            your_name: user.name,
            your_street: user.street,
            your_street2: user.street2,
            your_city: user.city,
            your_zip: user.zip,
            your_country: user.country,
            your_registration_no: user.registration_no,
            your_vat_no: user.vat_no,
            bank_account: user.bank_account,
            iban: user.iban,
            swift_bic: user.swift_bic,

            // client
            client_name: client.name,
            client_street: client.street,
            client_street2: client.street2,
            client_city: client.city,
            client_zip: client.zip,
            client_country: client.country,
            client_registration_no: client.registration_no,
            client_vat_no: client.vat_no
          })
          .returning({
            id: invoicesTb.id
          })
          .execute()
        console.log('invoice:', invoice)

        const items = await tx
          .insert(invoiceItemsTb)
          .values(
            input.items.map((item) => ({
              ...item,
              invoice_id: invoice.id
            }))
          )
          .execute()

        return invoice.id
      })
    }),
  all: protectedProc
    .input(
      z.object({
        limit: z.number().nullable().default(30),
        offset: z.number().nullish().default(0),
        filter: z.string().nullish()
      })
    )
    .query(async ({ ctx, input }) => {
      const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
        where: eq(invoicesTb.user_id, ctx.userId),
        limit: input.limit ?? undefined,
        offset: input.offset ?? undefined,
        orderBy: desc(invoicesTb.created_at)
      })

      return invoicesForUser
    }),
  count: protectedProc.query(async ({ ctx }) => {
    const res = await ctx.db
      .select({ count: count() })
      .from(invoicesTb)
      .where(eq(invoicesTb.user_id, ctx.userId))
      .execute()

    return res[0].count
  }),
  getById: protectedProc
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ input, ctx }) => {
      const res = await ctx.db.query.invoicesTb
        .findFirst({
          where: eq(invoicesTb.id, input.id)
        })
        .execute()

      const items = await ctx.db.query.invoiceItemsTb.findMany({
        where: eq(invoiceItemsTb.invoice_id, input.id)
      })

      return {
        ...res,
        items
      }
    }),
  delete: protectedProc
    .input(
      z.object({
        id: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.db
        .delete(invoicesTb)
        .where(eq(invoicesTb.id, input.id))
        .execute()
    }),
  update: protectedProc
    .input(
      z.object({
        id: z.string(),
        invoice: invoiceSchema,
        items: z.array(invoiceItemFormSchema)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const invoice = await ctx.db.query.invoicesTb.findFirst({
        where: eq(invoicesTb.id, input.id),

        columns: {
          id: true
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      await ctx.db.transaction(async (tx) => {
        const invoiceSums = getInvoiceSums(input.items)
        await tx
          .update(invoicesTb)
          .set({
            ...input.invoice,
            due_on: djs(input.invoice.issued_on)
              .add(input.invoice.due_in_days, 'day')
              .format('YYYY-MM-DD'),
            taxable_fulfillment_due: djs(
              input.invoice.taxable_fulfillment_due
            ).format('YYYY-MM-DD'),
            issued_on: djs(input.invoice.issued_on).format('YYYY-MM-DD'),
            ...invoiceSums
          })
          .where(eq(invoicesTb.id, input.id))
          .execute()

        await tx
          .delete(invoiceItemsTb)
          .where(eq(invoiceItemsTb.invoice_id, input.id))
          .execute()

        await tx
          .insert(invoiceItemsTb)
          .values(
            input.items.map((item) => ({
              ...item,
              invoice_id: input.id
            }))
          )
          .execute()
      })
    })
})
