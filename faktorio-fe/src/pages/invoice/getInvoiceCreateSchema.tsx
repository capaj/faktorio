import { invoiceInsertSchema } from '../../../../faktorio-api/src/zodDbSchemas'
import { z } from 'zod'
import cc from 'currency-codes'
import { djs } from '../../../../src/djs'

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
      issued_on: z.date().default(new Date()),
      number: z.string().default(nextInvoiceNumber),
      payment_method: z
        .enum(['bank', 'cash', 'card', 'cod', 'crypto', 'other'])
        .default('bank'),
      taxable_fulfillment_due: z
        .date()
        .default(djs().subtract(1, 'month').endOf('month').toDate()),
      exchange_rate: z.number().nullable().default(1)
      // due_on: z.date().default(djs().add(14, 'day').toDate())
      // sent_at: z.date().nullable().default(null),
      // paid_on: z.date().nullable().default(null),
      // reminder_sent_at: z.date().nullable().default(null)
    })
}
