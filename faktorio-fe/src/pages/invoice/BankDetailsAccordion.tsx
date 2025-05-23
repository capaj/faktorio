import { z } from 'zod/v4'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import AutoForm from '@/components/ui/auto-form'
import { invoiceForRenderSchema } from '../InvoiceDetail/InvoiceDetailPage'

interface BankDetailsAccordionProps {
  formValues: {
    bank_account: string
    iban: string
    swift_bic: string
  }
  setFormValues: (values: any) => void
}

export const BankDetailsAccordion = ({
  formValues,
  setFormValues
}: BankDetailsAccordionProps) => {
  const bankAccountSchema = invoiceForRenderSchema.pick({
    bank_account: true,
    iban: true,
    swift_bic: true
  })

  return (
    <Accordion type="single" collapsible className="mt-4 mb-6">
      <AccordionItem value="bank-details">
        <AccordionTrigger className="font-semibold">
          Bankovní údaje
        </AccordionTrigger>
        <AccordionContent>
          <div>
            <AutoForm
              formSchema={bankAccountSchema}
              containerClassName="grid grid-cols-2 md:grid-cols-3 gap-4"
              values={{
                bank_account: formValues.bank_account,
                iban: formValues.iban,
                swift_bic: formValues.swift_bic
              }}
              onParsedValuesChange={(values) => {
                setFormValues((prev: z.infer<typeof bankAccountSchema>) => ({
                  ...prev,
                  ...values
                }))
              }}
              fieldConfig={{
                bank_account: {
                  label: 'Číslo účtu'
                },
                iban: {
                  label: 'IBAN'
                },
                swift_bic: {
                  label: 'SWIFT/BIC'
                }
              }}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
