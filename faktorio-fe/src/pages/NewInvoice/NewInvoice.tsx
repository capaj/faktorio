import AutoForm from '@/components/ui/auto-form'
import { invoiceInsertSchema } from '../../../../faktorio-api/src/zodDbSchemas'
import { z } from 'zod'
import cc from 'currency-codes'
import { trpcClient } from '@/lib/trpcClient'
import { djs } from '@/lib/djs'
import { ComboboxDemo } from './ContactComboBox'

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
      taxable_fulfillment_due: z
        .date()
        .default(djs().subtract(1, 'month').endOf('month').toDate())
    })
  return (
    <div>
      <h2 className="mb-5">Nová faktura</h2>

      <ComboboxDemo />
      <AutoForm
        formSchema={formSchema}
        fieldConfig={{
          currency: {
            label: 'Měna'
          },
          issued_on: {
            label: 'Datum vystavení faktury'
          },
          number: {
            label: 'Číslo faktury'
          },
          payment_method: {
            label: 'Způsob platby'
          },
          taxable_fulfillment_due: {
            label: 'Datum zdanitelného plnění'
          },
          footer_note: {
            label: 'Poznámka'
          }
        }}
      ></AutoForm>
    </div>
  )
}
