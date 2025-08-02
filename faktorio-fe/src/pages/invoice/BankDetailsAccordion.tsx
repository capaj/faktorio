import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

import { Input } from '@/components/ui/input'
import { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'

interface BankDetailsAccordionProps {
  control: Control<any>
}

export const BankDetailsAccordion = ({ control }: BankDetailsAccordionProps) => {
  return (
    <Accordion type="single" collapsible className="mt-4 mb-6 background-muted hover:bg-muted p-4 rounded-md">
      <AccordionItem value="bank-details">
        <AccordionTrigger className="font-semibold">
          Bankovní údaje
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3">
            <FormField
              control={control}
              name="bank_account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Číslo účtu</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="swift_bic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT/BIC</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
