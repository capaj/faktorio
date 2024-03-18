import { z } from 'zod'
import {
  contactTb,
  invoiceItemsTb,
  invoicesTb,
  userInvoicingDetailsTb
} from '../schema'
import { trpcContext } from '../trpcContext'
import { count, eq } from 'drizzle-orm'
import { protectedProc } from '../isAuthorizedMiddleware'
import { getInvoiceCreateSchema } from '../../../faktorio-fe/src/pages/NewInvoice/getInvoiceCreateSchema'
import { djs } from '../../../src/djs'
import { invoiceItemFormSchema } from '../zodDbSchemas'

export const invoiceRouter = trpcContext.router({
  create: protectedProc
    .input(
      z.object({
        invoice: getInvoiceCreateSchema(djs().format('YYYYMMDD') + '001'),
        items: z.array(invoiceItemFormSchema)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const invoiceItems = input.items
      const subtotal = invoiceItems.reduce(
        (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
        0
      )
      const subTotalVat = invoiceItems.reduce(
        (acc, item) =>
          acc +
          ((item.quantity ?? 0) *
            (item.unit_price ?? 0) *
            (item.vat_rate ?? 0)) /
            100,
        0
      )

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
            subtotal: subtotal,
            total: subtotal + subTotalVat,
            native_subtotal: subtotal,
            native_total: subtotal + subTotalVat,

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
  all: protectedProc.query(async ({ ctx }) => {
    const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
      where: eq(invoicesTb.user_id, ctx.userId)
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
    })
})
