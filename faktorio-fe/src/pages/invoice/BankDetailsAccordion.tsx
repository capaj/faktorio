import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UseFormReturn } from 'react-hook-form'

export interface IBankAccountDetails {
  bank_account?: string
  iban?: string
  swift_bic?: string
}

interface BankDetailsAccordionProps {
  form: UseFormReturn<IBankAccountDetails>
}

export const BankDetailsAccordion = ({ form }: BankDetailsAccordionProps) => {
  const formValues = form.watch()

  const handleInputChange = (field: keyof IBankAccountDetails, value: string) => {
    form.setValue(field, value)
  }

  return (
    <Accordion type="single" collapsible className="mt-4 mb-6 background-muted hover:bg-muted p-4">
      <AccordionItem value="bank-details">
        <AccordionTrigger className="font-semibold">
          Bankovní údaje
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bank_account">Číslo účtu</Label>
              <Input
                id="bank_account"
                value={formValues.bank_account || ''}
                onChange={(e) => handleInputChange('bank_account', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formValues.iban || ''}
                onChange={(e) => handleInputChange('iban', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="swift_bic">SWIFT/BIC</Label>
              <Input
                id="swift_bic"
                value={formValues.swift_bic || ''}
                onChange={(e) => handleInputChange('swift_bic', e.target.value)}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
