import { trpcContext } from './trpcContext'
import { invoiceRouter } from './routers/invoices/invoiceRouter'
import { contactRouter } from './routers/contactRouter'
import { protectedProc } from './isAuthorizedMiddleware'
import {
  userInvoicingDetailsTb,
  systemStatsTb,
  invoiceShareEventTb,
  SharedInvoiceEventType,
  userBankAccountsTb
} from 'faktorio-db/schema'
import { conflictUpdateSetAll } from './drizzle-utils/conflictUpdateSet'
import { eq, desc, asc, and, notInArray } from 'drizzle-orm'

import { receivedInvoicesRouter } from './routers/receivedInvoicesRouter'
import { authRouter } from './routers/authRouter'
import { pushNotificationRouter } from './routers/pushNotificationRouter'
import { apiTokenRouter } from './routers/apiTokenRouter'
import {
  userInvoicingDetailsInsertSchema,
  bankAccountInputSchema
} from './zodDbSchemas'
import { createId } from '@paralleldrive/cuid2'

type UserBankAccountInsert = typeof userBankAccountsTb.$inferInsert
import { z } from 'zod/v4'

export const upsertInvoicingDetailsSchema = z
  .object({
    registration_no: z.string().min(8).max(8).optional() // this forces the input to be first in AutoForm
  })
  .merge(
    userInvoicingDetailsInsertSchema.omit({
      created_at: true,
      updated_at: true,
      user_id: true,
      registration_no: true,
      default_bank_account_id: true,
      iban: true,
      swift_bic: true
    })
  )
  .extend({
    bank_accounts: z.array(bankAccountInputSchema).default([])
  })

export const appRouter = trpcContext.router({
  test: trpcContext.procedure.query(async ({ ctx }) => {
    return 'test ' + new Date()
  }),
  auth: authRouter,
  invoices: invoiceRouter,
  contacts: contactRouter,
  receivedInvoices: receivedInvoicesRouter,
  apiTokens: apiTokenRouter,
  webPushNotifications: pushNotificationRouter,
  systemStats: trpcContext.procedure.query(async ({ ctx }) => {
    const latestStats = await ctx.db.query.systemStatsTb.findFirst({
      orderBy: desc(systemStatsTb.calculated_at)
    })

    return latestStats ?? { user_count: 0, invoice_count: 0 }
  }),
  invoicingDetails: protectedProc.query(async ({ ctx }) => {
    const [details, bankAccounts] = await Promise.all([
      ctx.db.query.userInvoicingDetailsTb
        .findFirst({
          where: eq(userInvoicingDetailsTb.user_id, ctx.user.id)
        })
        .execute(),
      ctx.db.query.userBankAccountsTb
        .findMany({
          where: eq(userBankAccountsTb.user_id, ctx.user.id),
          orderBy: (accounts, { asc }) => [asc(accounts.order)]
        })
        .execute()
    ])

    if (!details) {
      return null
    }

    const enrichedAccounts = bankAccounts.map((account) => ({
      ...account,
      is_default: account.id === details.default_bank_account_id
    }))

    return {
      ...details,
      bankAccounts: enrichedAccounts
    }
  }),
  upsertInvoicingDetails: protectedProc
    .input(upsertInvoicingDetailsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const { bank_accounts = [], ...detailsInput } = input

        const normalizeValue = (value?: string | null) => {
          if (value === undefined || value === null) return null
          const trimmed = value.trim()
          return trimmed.length ? trimmed : null
        }

        const preparedAccounts = bank_accounts.reduce<
          { dbValues: UserBankAccountInsert; isDefault: boolean }[]
        >((acc, account, index) => {
          const trimmedId = account.id?.trim()
          const accountId = trimmedId && trimmedId.length ? trimmedId : createId()

          const dbValues: UserBankAccountInsert = {
            id: accountId,
            user_id: ctx.user.id,
            label: normalizeValue(account.label),
            bank_account: normalizeValue(account.bank_account),
            iban: normalizeValue(account.iban),
            swift_bic: normalizeValue(account.swift_bic),
            qrcode_decoded: normalizeValue(account.qrcode_decoded),
            order:
              typeof account.order === 'number' && Number.isFinite(account.order)
                ? account.order
                : index
          }

          const hasContent = Boolean(
            dbValues.bank_account ||
              dbValues.iban ||
              dbValues.swift_bic ||
              dbValues.qrcode_decoded
          )

          if (!hasContent) {
            return acc
          }

          acc.push({
            dbValues,
            isDefault: Boolean(account.is_default)
          })

          return acc
        }, [])

        const normalizedAccounts = preparedAccounts.map((entry, index) => ({
          ...entry,
          dbValues: {
            ...entry.dbValues,
            order: index
          }
        }))

        const defaultAccountEntry =
          normalizedAccounts.find((account) => account.isDefault) ??
          normalizedAccounts[0] ??
          null

        const defaultAccountId = defaultAccountEntry?.dbValues.id ?? null
        const defaultAccountValues = defaultAccountEntry?.dbValues ?? null

        // Upsert each bank account individually
        const accountIds = new Set<string>()
        for (const { dbValues } of normalizedAccounts) {
          accountIds.add(dbValues.id!)

          // Upsert without touching the reserved column "order" in the ON CONFLICT SET
          await tx
            .insert(userBankAccountsTb)
            .values(dbValues)
            .onConflictDoUpdate({
              target: [userBankAccountsTb.id],
              set: {
                // Only update mutable, non-reserved columns here
                user_id: dbValues.user_id,
                label: dbValues.label ?? null,
                bank_account: dbValues.bank_account ?? null,
                iban: dbValues.iban ?? null,
                swift_bic: dbValues.swift_bic ?? null,
                qrcode_decoded: dbValues.qrcode_decoded ?? null
              }
            })
        }

        // Apply ordering in a separate UPDATE to avoid ON CONFLICT parsing issues around "order"
        for (const { dbValues } of normalizedAccounts) {
          await tx
            .update(userBankAccountsTb)
            .set({ order: dbValues.order })
            .where(
              and(
                eq(userBankAccountsTb.user_id, ctx.user.id),
                eq(userBankAccountsTb.id, dbValues.id!)
              )
            )
        }

        // Delete bank accounts that are no longer in the input
        if (accountIds.size > 0) {
          await tx
            .delete(userBankAccountsTb)
            .where(
              and(
                eq(userBankAccountsTb.user_id, ctx.user.id),
                notInArray(userBankAccountsTb.id, Array.from(accountIds))
              )
            )
        } else {
          // If no accounts provided, delete all
          await tx
            .delete(userBankAccountsTb)
            .where(eq(userBankAccountsTb.user_id, ctx.user.id))
        }

        // Update invoicing details with the correct default bank account
        await tx
          .insert(userInvoicingDetailsTb)
          .values({
            ...detailsInput,
            user_id: ctx.user.id,
            iban: defaultAccountValues?.iban ?? null,
            swift_bic: defaultAccountValues?.swift_bic ?? null,
            default_bank_account_id: defaultAccountId
          })
          .onConflictDoUpdate({
            target: [userInvoicingDetailsTb.user_id],
            set: conflictUpdateSetAll(userInvoicingDetailsTb)
          })
      })
    }),
  sharedInvoiceEvent: trpcContext.procedure
    .input(z.object({ shareId: z.string(), type: SharedInvoiceEventType }))
    .mutation(async ({ ctx, input }) => {
      const { shareId, type } = input
      const agent = ctx.req.headers.get('user-agent') ?? ''
      const ip = ctx.req.headers.get('cf-connecting-ip') ?? ''
      const country = ctx.req.headers.get('cf-ipcountry') ?? ''
      const referer = ctx.req.headers.get('referer') ?? ''
      const path = ctx.req.url ?? ''
      await ctx.db
        .insert(invoiceShareEventTb)
        .values({
          share_id: shareId,
          event_type: type,
          ip_address: ip,
          user_agent: agent,
          referer,
          path
        })
    })
})

export type AppRouter = typeof appRouter
