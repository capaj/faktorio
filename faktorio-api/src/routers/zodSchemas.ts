import { z } from 'zod'

import { invoiceInsertSchema } from '../zodDbSchemas'

import cc from 'currency-codes'
import { djs } from 'faktorio-shared/src/djs'

export const dateSchema = z
  .string()
  .nullish()
  .refine((v) => !v || djs(v).isValid(), 'Invalid date')

export const stringDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const paymentMethodEnum = z
  .enum(['bank', 'cash', 'card', 'cod', 'crypto', 'other'])
  .default('bank')

export function getInvoiceCreateSchema(nextInvoiceNumber: string) {
  return z.object({
    number: z.string().default(nextInvoiceNumber),
    currency: z.enum(cc.codes() as [string, ...string[]]).default('CZK'),
    issued_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .default(djs().format('YYYY-MM-DD')),
    payment_method: paymentMethodEnum,
    footer_note: z.string().nullish(),
    taxable_fulfillment_due: stringDateSchema.default(
      djs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
    ),
    due_in_days: z.number(),
    client_contact_id: z.string(),
    exchange_rate: z.number().nullable().default(1),
    bank_account: z.string().optional().default(''),
    iban: z.string().optional().default(''),
    swift_bic: z.string().optional().default('')
  })
}
