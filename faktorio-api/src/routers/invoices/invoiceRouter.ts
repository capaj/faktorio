import { z } from 'zod/v4'
import {
  contactTb,
  invoiceItemsTb,
  invoicesTb,
  userInvoicingDetailsTb,
  userBankAccountsTb
} from 'faktorio-db/schema'
import { trpcContext } from '../../trpcContext'
import {
  SQL,
  and,
  count,
  asc,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
  inArray
} from 'drizzle-orm'
import { protectedProc } from '../../isAuthorizedMiddleware'
import { getInvoiceCreateSchema, stringDateSchema } from '../zodSchemas'
import { djs } from 'faktorio-shared/src/djs'
import { invoiceItemFormSchema } from '../../zodDbSchemas'
import { getInvoiceSums } from './getInvoiceSums'
import { getCNBExchangeRate } from './getCNBExchangeRate'
import { invoiceShareEventTb, invoiceShareTb } from 'faktorio-db/schema'

const invoiceSchema = getInvoiceCreateSchema(djs().format('YYYYMMDD') + '001')

const createInvoiceInput = z.object({
  invoice: invoiceSchema,
  items: z.array(
    invoiceItemFormSchema.extend({
      quantity: z.coerce.number().optional(),
      unit_price: z.coerce.number().optional(),
      vat_rate: z.coerce.number().optional()
    })
  )
})

const updateInvoiceInput = z.object({
  id: z.string(),
  invoice: invoiceSchema,
  items: z.array(
    invoiceItemFormSchema.extend({
      quantity: z.coerce.number().optional(),
      unit_price: z.coerce.number().optional(),
      vat_rate: z.coerce.number().optional()
    })
  )
})

export const invoiceRouter = trpcContext.router({
  createShare: protectedProc
    .input(
      z.object({
        invoiceId: z.string(),
        // ISO date-time string or YYYY-MM-DD
        expiresAt: z.string().nullish()
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ensure invoice belongs to user
      const inv = await ctx.db.query.invoicesTb.findFirst({
        where: and(
          eq(invoicesTb.id, input.invoiceId),
          eq(invoicesTb.user_id, ctx.user!.id)
        ),
        columns: { id: true }
      })
      if (!inv) throw new Error('Invoice not found')

      const [share] = await ctx.db
        .insert(invoiceShareTb)
        .values({
          invoice_id: input.invoiceId,
          user_id: ctx.user!.id,
          expires_at: input.expiresAt ?? null
        })
        .returning()
        .execute()

      return share
    }),
  revokeShare: protectedProc
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ensure share belongs to user
      const share = await ctx.db.query.invoiceShareTb.findFirst({
        where: and(
          eq(invoiceShareTb.id, input.shareId),
          eq(invoiceShareTb.user_id, ctx.user!.id)
        ),
        columns: { id: true, disabled_at: true }
      })
      if (!share) throw new Error('Share not found')

      const [updated] = await ctx.db
        .update(invoiceShareTb)
        .set({ disabled_at: djs().toISOString() })
        .where(eq(invoiceShareTb.id, input.shareId))
        .returning()
        .execute()
      return updated
    }),
  listShares: protectedProc
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // verify ownership
      const inv = await ctx.db.query.invoicesTb.findFirst({
        where: and(
          eq(invoicesTb.id, input.invoiceId),
          eq(invoicesTb.user_id, ctx.user!.id)
        ),
        columns: { id: true }
      })
      if (!inv) throw new Error('Invoice not found')

      const shares = await ctx.db.query.invoiceShareTb.findMany({
        where: eq(invoiceShareTb.invoice_id, input.invoiceId),
        orderBy: desc(invoiceShareTb.created_at)
      })

      if (shares.length === 0) return shares

      const counts = await ctx.db
        .select({
          share_id: invoiceShareEventTb.share_id,
          view_count: sql<number>`SUM(CASE WHEN ${invoiceShareEventTb.event_type} = 'view' THEN 1 ELSE 0 END)`,
          download_count: sql<number>`SUM(CASE WHEN ${invoiceShareEventTb.event_type} = 'download' THEN 1 ELSE 0 END)`,
          copy_count: sql<number>`SUM(CASE WHEN ${invoiceShareEventTb.event_type} = 'copy' THEN 1 ELSE 0 END)`
        })
        .from(invoiceShareEventTb)
        .where(
          inArray(
            invoiceShareEventTb.share_id,
            shares.map((s) => s.id)
          )
        )
        .groupBy(invoiceShareEventTb.share_id)
        .execute()

      const countsByShareId = new Map<
        string,
        { view_count: number; download_count: number; copy_count: number }
      >()
      for (const row of counts) {
        countsByShareId.set(row.share_id, {
          view_count: row.view_count ?? 0,
          download_count: row.download_count ?? 0,
          copy_count: row.copy_count ?? 0
        })
      }

      return shares.map((s) => {
        const c = countsByShareId.get(s.id) ?? {
          view_count: 0,
          download_count: 0,
          copy_count: 0
        }
        return { ...s, ...c }
      })
    }),
  getShareStats: protectedProc
    .input(z.object({ shareId: z.string() }))
    .query(async ({ ctx, input }) => {
      const share = await ctx.db.query.invoiceShareTb.findFirst({
        where: and(
          eq(invoiceShareTb.id, input.shareId),
          eq(invoiceShareTb.user_id, ctx.user!.id)
        )
      })
      if (!share) throw new Error('Share not found')

      const events = await ctx.db.query.invoiceShareEventTb.findMany({
        where: eq(invoiceShareEventTb.share_id, input.shareId),
        orderBy: desc(invoiceShareEventTb.created_at),
        limit: 200
      })

      return { share, events }
    }),
  create: protectedProc
    .input(createInvoiceInput)
    .mutation(async ({ input, ctx }) => {
      const invoiceItems = input.items
      const invoiceSums = getInvoiceSums(
        invoiceItems,
        input.invoice.exchange_rate ?? 1
      )

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

      let defaultAccount = null

      if (user.default_bank_account_id) {
        defaultAccount = await ctx.db.query.userBankAccountsTb
          .findFirst({
            where: eq(userBankAccountsTb.id, user.default_bank_account_id)
          })
          .execute()
      }

      if (!defaultAccount) {
        defaultAccount = await ctx.db.query.userBankAccountsTb
          .findFirst({
            where: eq(userBankAccountsTb.user_id, ctx.user.id),
            orderBy: (accounts, { asc }) => [
              asc(accounts.order),
              asc(accounts.created_at)
            ]
          })
          .execute()
      }

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
            exchange_rate: input.invoice.exchange_rate ?? 1,
            ...invoiceSums,

            // user
            your_name: user.name,
            your_street: user.street,
            your_street2: user.street2,
            your_city: user.city,
            your_zip: user.zip,
            your_country: user.country,
            your_registration_no: user.registration_no ?? '',
            your_vat_no: user.vat_no ?? '',
            bank_account: defaultAccount?.bank_account ?? null,
            iban: defaultAccount?.iban ?? user.iban,
            swift_bic: defaultAccount?.swift_bic ?? user.swift_bic,

            // client
            client_name: client.name,
            client_street: client.street ?? '',
            client_street2: client.street2,
            client_city: client.city ?? '',
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

        await tx
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
  listInvoices: protectedProc
    .input(
      z.object({
        limit: z.number().nullable().default(30),
        offset: z.number().nullish().default(0),
        filter: z.string().nullish(),
        currency: z.string().min(3).max(3).nullish(),
        from: stringDateSchema.nullish(), // YYYY-MM-DD
        to: stringDateSchema.nullish(),
        year: z.number().nullish(), // Add year filter
        vat: z
          .object({
            minimum: z.number().nullish(),
            maximum: z.number().nullish()
          })
          .nullish()
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions: SQL[] = [eq(invoicesTb.user_id, ctx.user.id)]

      if (input.filter) {
        conditions.push(
          or(
            like(invoicesTb.client_name, `%${input.filter}%`),
            like(invoicesTb.number, `%${input.filter}%`),
            like(invoicesTb.client_registration_no, `%${input.filter}%`),
            like(invoicesTb.client_vat_no, `%${input.filter}%`)
          )!
        )
      }

      // Year filter (preferred over from/to date if provided)
      if (input.year !== null && input.year !== undefined) {
        const year = input.year
        const startDate = `${year}-01-01`
        const endDate = `${year + 1}-01-01`

        conditions.push(gte(invoicesTb.taxable_fulfillment_due, startDate))
        conditions.push(lte(invoicesTb.taxable_fulfillment_due, endDate))
      } else {
        // Original date range filter (only apply if year is not set)
        if (input.from) {
          conditions.push(gte(invoicesTb.taxable_fulfillment_due, input.from))
        }

        if (input.to) {
          conditions.push(lte(invoicesTb.taxable_fulfillment_due, input.to))
        }
      }

      if (input.vat?.minimum !== null && input.vat?.minimum !== undefined) {
        // Filter for invoices where total VAT is >= minimum
        // Total VAT = vat_21 + vat_12 (+ other VAT rates if they exist)
        const totalVatExpression = sql`COALESCE(${invoicesTb.vat_21}, 0) + COALESCE(${invoicesTb.vat_12}, 0)`
        conditions.push(sql`${totalVatExpression} >= ${input.vat.minimum}`)
      } else if (
        input.vat?.maximum !== null &&
        input.vat?.maximum !== undefined
      ) {
        // Filter for invoices where total VAT is <= maximum
        // Total VAT = vat_21 + vat_12 (+ other VAT rates if they exist)
        const totalVatExpression = sql`COALESCE(${invoicesTb.vat_21}, 0) + COALESCE(${invoicesTb.vat_12}, 0)`
        conditions.push(sql`${totalVatExpression} <= ${input.vat.maximum}`)
      }

      if (input.currency) {
        conditions.push(eq(invoicesTb.currency, input.currency))
      }

      const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
        where: and(...conditions),
        limit: input.limit ?? undefined,
        offset: input.offset ?? undefined,
        orderBy: [
          desc(invoicesTb.taxable_fulfillment_due),
          desc(invoicesTb.created_at)
        ] // Order by taxable date
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

      if (!res) {
        throw new Error(`Invoice ${input.id} not found`)
      }

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
    .input(updateInvoiceInput)
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
        const invoiceSums = getInvoiceSums(
          input.items,
          input.invoice.exchange_rate ?? 1
        )
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
            ...invoiceSums,
            exchange_rate: input.invoice.exchange_rate ?? 1
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
            input.items.map((item) => {
              const { id, created_at: _created_at, updated_at: _updated_at, invoice_id: _invoice_id, ...itemData } = item as any
              return {
                ...(id ? { id } : {}),
                ...itemData,
                invoice_id: input.id
              }
            })
          )
          .execute()
      })
    }),
  getExchangeRate: protectedProc
    .input(
      z.object({
        currency: z.string(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish()
      })
    )
    .query(async ({ input }) => {
      return getCNBExchangeRate({
        currency: input.currency,
        date: input.date
      })
    }),

  markAsPaid: protectedProc
    .input(
      z.object({
        id: z.string(),
        // Allow string date (YYYY-MM-DD) or null to mark as unpaid
        paidOn: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Invalid date format, expected YYYY-MM-DD'
          )
          .nullable()
          .describe(
            'Payment date in YYYY-MM-DD format, or null to mark as unpaid'
          )
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

      // If input.paidOn is explicitly null, use null. Otherwise, use the provided date or default to today.
      const paidOnValue =
        input.paidOn === null
          ? null
          : input.paidOn || djs().format('YYYY-MM-DD')

      const result = await ctx.db
        .update(invoicesTb)
        .set({
          paid_on: paidOnValue, // Use the determined value (date string or null)
          updated_at: djs().toISOString() // Always update timestamp
        })
        .where(eq(invoicesTb.id, input.id))
        .returning({
          id: invoicesTb.id,
          number: invoicesTb.number,
          paid_on: invoicesTb.paid_on
        })
        .execute()

      return result[0]
    })
})
