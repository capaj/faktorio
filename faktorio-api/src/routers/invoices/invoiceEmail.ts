import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import {
  contactTb,
  invoicesTb,
  invoiceShareTb,
  userInvoicingDetailsTb
} from 'faktorio-db/schema'
import { djs } from 'faktorio-shared/src/djs'
import { invoiceEmailLanguage } from 'faktorio-shared/src/invoiceEmail'
import { z } from 'zod/v4'
import { protectedProc } from '../../isAuthorizedMiddleware'
import type { TrpcContext } from '../../trpcContext'

const emailInput = z.object({
  invoiceId: z.string().min(1),
  kind: z.enum(['invoice', 'reminder'])
})

async function ownedInvoice(ctx: TrpcContext, invoiceId: string) {
  const invoice = await ctx.db.query.invoicesTb.findFirst({
    where: and(
      eq(invoicesTb.id, invoiceId),
      eq(invoicesTb.user_id, ctx.user!.id)
    )
  })
  if (!invoice)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Faktura nebyla nalezena.'
    })
  return invoice
}

function checkSendable(
  invoice: typeof invoicesTb.$inferSelect,
  kind: 'invoice' | 'reminder'
) {
  if (invoice.cancelled_at)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Zrušenou fakturu nelze odeslat.'
    })
  if (kind === 'reminder' && (invoice.paid_on || invoice.status === 'paid')) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Zaplacenou fakturu nelze upomínat.'
    })
  }
}

export const getEmailDraft = protectedProc
  .input(emailInput)
  .query(async ({ ctx, input }) => {
    const invoice = await ownedInvoice(ctx, input.invoiceId)
    checkSendable(invoice, input.kind)
    const contact = await ctx.db.query.contactTb.findFirst({
      where: and(
        eq(contactTb.id, invoice.client_contact_id),
        eq(contactTb.user_id, ctx.user.id)
      )
    })
    return {
      to: contact?.main_email || contact?.email || invoice.client_email || '',
      language: invoiceEmailLanguage(contact?.language, invoice.language),
      number: invoice.number,
      dueOn: invoice.due_on,
      senderName: invoice.your_name
    }
  })

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]!
  )

export const sendInvoiceEmail = protectedProc
  .input(
    emailInput.extend({
      to: z.string().trim().email().max(254),
      language: z.enum(['cs', 'en']),
      subject: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(/^[^\r\n]+$/),
      body: z.string().trim().min(1).max(20000)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const invoice = await ownedInvoice(ctx, input.invoiceId)
    checkSendable(invoice, input.kind)
    const details = await ctx.db.query.userInvoicingDetailsTb.findFirst({
      where: eq(userInvoicingDetailsTb.user_id, ctx.user.id)
    })
    const replyTo = z.email().safeParse(details?.main_email || ctx.user.email)
    // Use a configured origin, never a client-supplied URL or Host header.
    const base = new URL(ctx.env.PUBLIC_APP_URL ?? 'https://faktorio.cz')
    const [share] = await ctx.db
      .insert(invoiceShareTb)
      .values({
        invoice_id: invoice.id,
        user_id: ctx.user.id
      })
      .returning()
    const link = new URL(`/shared-invoice/${share.id}`, base).href
    const linkLabel =
      input.language === 'cs'
        ? 'Zobrazit a stáhnout fakturu'
        : 'View and download invoice'
    try {
      await ctx.sendEmail({
        to: { email: input.to, name: invoice.client_name },
        subject: input.subject,
        text: `${input.body}\n\n${linkLabel}: ${link}`,
        html: `<div>${escapeHtml(input.body).replace(/\r?\n/g, '<br>')}</div><p><a href="${escapeHtml(link)}">${linkLabel}</a></p>`,
        ...(replyTo.success
          ? { replyTo: { email: replyTo.data, name: invoice.your_name } }
          : {})
      })
    } catch {
      // A failed send must not leave an unused public share or mark the invoice sent.
      await ctx.db.delete(invoiceShareTb).where(eq(invoiceShareTb.id, share.id))
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'E-mail se nepodařilo odeslat. Zkuste to prosím znovu.'
      })
    }
    const sentAt = djs().format('YYYY-MM-DD')
    await ctx.db
      .update(invoicesTb)
      .set(
        input.kind === 'invoice'
          ? { sent_at: sentAt }
          : { reminder_sent_at: sentAt }
      )
      .where(
        and(eq(invoicesTb.id, invoice.id), eq(invoicesTb.user_id, ctx.user.id))
      )
    return { sentAt }
  })
