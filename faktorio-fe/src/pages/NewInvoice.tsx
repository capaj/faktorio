import AutoForm from '@/components/ui/auto-form'
import { invoiceInsertSchema } from '../../../faktorio-api/src/zodDbSchemas'
import { z } from 'zod'
import cc from 'currency-codes'
import { trpcClient } from '@/lib/trpcClient'
import { djs } from '@/lib/djs'

export const NewInvoice = () => {
  const [invoicesCount] = trpcClient.invoices.count.useSuspenseQuery()

  const invoiceOrdinal = invoicesCount + 1
  const nextInvoiceNumber = `${djs().format('YYYY')}-${invoiceOrdinal.toString().padStart(3, '0')}`
  const formSchema = invoiceInsertSchema
    .pick({
      number: true,
      currency: true,
      issued_on: true,
      payment_method: true,
      footer_note: true,
      taxable_fulfillment_due: true
    })
    .extend({
      // @ts-expect-error
      currency: z.enum([...cc.codes()]).default('CZK'),
      issued_on: z.date().default(new Date()),
      number: z.string().default(nextInvoiceNumber),
      payment_method: z
        .enum(['bank', 'cash', 'card', 'cod', 'crypto', 'other'])
        .default('bank'),
      taxable_fulfillment_due: z.date()
    })
  return (
    <div>
      <h2>New Invoice</h2>
      <AutoForm formSchema={formSchema}></AutoForm>
    </div>
  )
}
