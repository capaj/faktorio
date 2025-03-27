import { z } from 'zod'
import {
  contactTb,
  invoiceItemsTb,
  invoicesTb,
  userInvoicingDetailsTb
} from '../../schema'
import { trpcContext } from '../../trpcContext'
import { SQL, and, asc, count, desc, eq, gte, like, lte, or } from 'drizzle-orm'
import { protectedProc } from '../../isAuthorizedMiddleware'
import { getInvoiceCreateSchema } from '../../../../faktorio-fe/src/pages/invoice/getInvoiceCreateSchema'
import { djs } from '../../../../src/djs'
import { invoiceItemFormSchema } from '../../zodDbSchemas'
import { getInvoiceSums } from './getInvoiceSums'
import { getCNBExchangeRate } from './getCNBExchangeRate'

const invoiceSchema = getInvoiceCreateSchema(djs().format('YYYYMMDD') + '001')
const dateSchema = z
  .string()
  .nullish()
  .refine((v) => !v || djs(v).isValid(), 'Invalid date')

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

      const client = await ctx.db.query.contactTb
        .findFirst({
          where: eq(contactTb.id, input.invoice.client_contact_id)
        })
        .execute()

      const user = await ctx.db.query.userInvoicingDetailsTb
        .findFirst({
          where: eq(userInvoicingDetailsTb.user_id, ctx.user.id)
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
        // Handle date fields consistently like in the update mutation

        // Calculate due_on based on issued_on
        const due_on = djs(input.invoice.issued_on)
          .add(input.invoice.due_in_days, 'day')
          .format('YYYY-MM-DD')

        const [invoice] = await tx
          .insert(invoicesTb)
          .values({
            ...input.invoice,
            due_on,
            taxable_fulfillment_due: input.invoice.taxable_fulfillment_due,
            issued_on: input.invoice.issued_on,
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
            client_vat_no: client.vat_no,
            user_id: ctx.user.id
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
        filter: z.string().nullish(),
        from_date: dateSchema, // YYYY-MM-DD
        to_date: dateSchema
      })
    )
    .query(async ({ ctx, input }) => {
      let whereCondition = eq(invoicesTb.user_id, ctx.user.id)

      if (input.filter) {
        whereCondition = and(
          whereCondition,
          or(
            like(invoicesTb.client_name, `%${input.filter}%`),
            like(invoicesTb.number, `%${input.filter}%`),
            like(invoicesTb.client_registration_no, `%${input.filter}%`),
            like(invoicesTb.client_vat_no, `%${input.filter}%`)
          )
        ) as SQL<unknown>
      }

      if (input.from_date) {
        whereCondition = and(
          whereCondition,
          gte(invoicesTb.taxable_fulfillment_due, input.from_date)
        ) as SQL<unknown>
      }

      if (input.to_date) {
        whereCondition = and(
          whereCondition,
          lte(invoicesTb.taxable_fulfillment_due, input.to_date)
        ) as SQL<unknown>
      }

      const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
        where: whereCondition,
        limit: input.limit ?? undefined,
        offset: input.offset ?? undefined,
        orderBy: desc(invoicesTb.created_at)
      })

      return invoicesForUser
    }),

  lastInvoice: protectedProc.query(async ({ ctx }) => {
    const lastInvoice = await ctx.db.query.invoicesTb.findFirst({
      where: eq(invoicesTb.user_id, ctx.user.id),
      orderBy: desc(invoicesTb.created_at)
    })

    return lastInvoice ?? null
  }),
  count: protectedProc.query(async ({ ctx }) => {
    const res = await ctx.db
      .select({ count: count() })
      .from(invoicesTb)
      .where(eq(invoicesTb.user_id, ctx.user.id))
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
          where: and(
            eq(invoicesTb.id, input.id),
            eq(invoicesTb.user_id, ctx.user.id)
          )
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
        .where(
          and(eq(invoicesTb.id, input.id), eq(invoicesTb.user_id, ctx.user.id))
        )
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
        where: and(
          eq(invoicesTb.id, input.id),
          eq(invoicesTb.user_id, ctx.user.id)
        ),

        columns: {
          id: true
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      await ctx.db.transaction(async (tx) => {
        const invoiceSums = getInvoiceSums(input.items)
        console.log(
          'Update invoice input - taxable_fulfillment_due:',
          input.invoice.taxable_fulfillment_due
        )

        // No need for additional conversion - client now sends a string in YYYY-MM-DD format

        // Calculate due_on based on issued_on
        const due_on = djs(input.invoice.issued_on)
          .add(input.invoice.due_in_days, 'day')
          .format('YYYY-MM-DD')

        await tx
          .update(invoicesTb)
          .set({
            ...input.invoice,
            due_on,
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
    }),
  getExchangeRate: protectedProc
    .input(
      z.object({
        currency: z.string(),
        date: z.date().nullish()
      })
    )
    .query(async ({ input }) => {
      return getCNBExchangeRate(input.currency, input.date)
    })
})
