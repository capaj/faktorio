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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { UserBankAccountSelectType } from 'faktorio-api/src/zodDbSchemas'

type BankAccountOption = Pick<
  UserBankAccountSelectType,
  'id' | 'label' | 'bank_account' | 'iban' | 'swift_bic'
>

interface BankDetailsAccordionProps {
  control: Control<any>
  bankAccounts?: BankAccountOption[]
  selectedBankAccountId?: string
  onBankAccountChange?: (accountId: string) => void
}

const formatAccountLabel = (account: BankAccountOption) => {
  const label = account.label?.trim()
  const bankNumber = account.bank_account?.trim()

  if (label && bankNumber) {
    return `${label} – ${bankNumber}`
  }

  return label ?? bankNumber ?? 'Bez názvu'
}

export const BankDetailsAccordion = ({
  control,
  bankAccounts,
  selectedBankAccountId,
  onBankAccountChange
}: BankDetailsAccordionProps) => {
  const accountsWithId = (bankAccounts ?? []).filter(
    (account): account is BankAccountOption & { id: string } =>
      Boolean(account?.id)
  )
  const shouldShowBankAccountSelect =
    Boolean(onBankAccountChange) && accountsWithId.length > 0
  const activeSelectValue = selectedBankAccountId ?? 'custom'

  return (
    <Accordion type="single" collapsible className="mt-4 mb-6 background-muted hover:bg-muted p-4 rounded-md">
      <AccordionItem value="bank-details">
        <AccordionTrigger className="font-semibold">
          Bankovní údaje
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3">
            {shouldShowBankAccountSelect && (
              <div className="md:col-span-3 flex flex-col gap-2">
                <FormLabel>Vyberte bankovní účet</FormLabel>
                <Select
                  value={activeSelectValue}
                  onValueChange={(value) => {
                    onBankAccountChange?.(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Vyberte bankovní účet" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsWithId.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {formatAccountLabel(account)}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Vlastní údaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
