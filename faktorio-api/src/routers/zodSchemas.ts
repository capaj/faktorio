import { z } from 'zod'

import { invoiceInsertSchema } from '../zodDbSchemas'

import cc from 'currency-codes'
import { djs } from 'faktorio-shared/src/djs'

export const dateSchema = z
  .string()
  .nullish()
  .refine((v) => !v || djs(v).isValid(), 'Invalid date')

export const stringDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export function getInvoiceCreateSchema(nextInvoiceNumber: string) {
  return invoiceInsertSchema
    .pick({
      number: true,
      currency: true,
      issued_on: true,
      payment_method: true,
      footer_note: true,
      taxable_fulfillment_due: true,
      due_in_days: true,
      client_contact_id: true,
      exchange_rate: true,
      bank_account: true,
      iban: true,
      swift_bic: true
    })
    .extend({
      // @ts-expect-error
      currency: z.enum([...cc.codes()]).default('CZK'),
      issued_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .default(djs().format('YYYY-MM-DD')),
      number: z.string().default(nextInvoiceNumber),
      payment_method: z
        .enum(['bank', 'cash', 'card', 'cod', 'crypto', 'other'])
        .default('bank'),
      taxable_fulfillment_due: stringDateSchema.default(
        djs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
      ),
      exchange_rate: z.number().nullable().default(1),
      bank_account: z.string().optional().default(''),
      iban: z.string().optional().default(''),
      swift_bic: z.string().optional().default('')
      // due_on: z.date().default(djs().add(14, 'day').toDate())
      // sent_at: z.date().nullable().default(null),
      // paid_on: z.date().nullable().default(null),
      // reminder_sent_at: z.date().nullable().default(null)
    })
}
