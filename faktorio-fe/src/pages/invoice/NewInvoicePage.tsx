import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2, LucideClock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { getInvoiceCreateSchema } from 'faktorio-api/src/routers/zodSchemas'
import { djs } from 'faktorio-shared/src/djs'
import { useFieldArray, useForm, useFormContext, Control } from 'react-hook-form'
import { z } from 'zod/v4'
import {
  invoiceItemFormSchema,
  type UserBankAccountSelectType
} from 'faktorio-api/src/zodDbSchemas'
import { useCallback, useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { BankDetailsAccordion } from './BankDetailsAccordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { CurrencySelect } from '@/components/ui/currency-select'
import { InvoiceTotals } from './InvoiceTotals'
import { ButtonLink } from '@/components/ui/link'
import { getPrimaryBankAccount } from '@/lib/getPrimaryBankAccount'
import { getMonthWorkingDays } from '@/lib/czechWorkingDays'

const defaultInvoiceItem = {
  description: '',
  unit: 'manday',
  quantity: 1,
  unit_price: 0,
  vat_rate: 21
}

const parseLocalizedFloat = (value: string) => {
  const normalizedValue = value.replace(',', '.').trim()

  if (normalizedValue === '') {
    return undefined
  }

  const parsedValue = Number.parseFloat(normalizedValue)
  return Number.isNaN(parsedValue) ? undefined : parsedValue
}

export const NewInvoicePage = () => {
  const [lastInvoice] = trpcClient.invoices.lastInvoice.useSuspenseQuery()
  const [contacts] = trpcClient.contacts.all.useSuspenseQuery()
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()
  const primaryBankAccount = getPrimaryBankAccount(invoicingDetails)
  const bankAccounts = (invoicingDetails?.bankAccounts ??
    []) as UserBankAccountSelectType[]

  const invoiceOrdinal =
    parseInt(lastInvoice?.number?.split('-')[1] ?? '0', 10) + 1
  const nextInvoiceNumber = `${djs().format('YYYY')}-${invoiceOrdinal.toString().padStart(3, '0')}`
  const formSchema = getInvoiceCreateSchema(nextInvoiceNumber)
    .omit({
      client_contact_id: true
    })
    .extend({
      client_contact_id: z.string().optional(),
      language: z.string().default('cs')
    })

  const form = useForm<
    z.infer<typeof formSchema> & {
      items: z.infer<typeof invoiceItemFormSchema>[]
    }
  >({
    defaultValues: {
      ...formSchema.parse({
        due_in_days: 14,
        bank_account: primaryBankAccount.bank_account || '',
        iban: primaryBankAccount.iban || '',
        swift_bic: primaryBankAccount.swift_bic || '',
        language: 'cs'
      }),
      items: [defaultInvoiceItem]
    }
  })

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(
    () => {
      if (
        primaryBankAccount.id &&
        bankAccounts.some((account) => account?.id === primaryBankAccount.id)
      ) {
        return primaryBankAccount.id
      }

      const firstAccountWithId = bankAccounts.find((account) => account?.id)
      return firstAccountWithId?.id ?? 'custom'
    }
  )

  const handleBankAccountChange = useCallback(
    (accountId: string) => {
      if (accountId === 'custom') {
        setSelectedBankAccountId('custom')
        return
      }

      const account = bankAccounts.find((item) => item?.id === accountId)

      if (!account) {
        setSelectedBankAccountId('custom')
        return
      }

      setSelectedBankAccountId(accountId)

      const ensureString = (value?: string | null) => value ?? ''
      const maybeUpdateField = (
        field: 'bank_account' | 'iban' | 'swift_bic',
        newValue: string
      ) => {
        if (form.getValues(field) !== newValue) {
          form.setValue(field, newValue, { shouldDirty: true })
        }
      }

      maybeUpdateField('bank_account', ensureString(account.bank_account))
      maybeUpdateField('iban', ensureString(account.iban))
      maybeUpdateField('swift_bic', ensureString(account.swift_bic))
    },
    [bankAccounts, form]
  )

  useEffect(() => {
    if (
      selectedBankAccountId !== 'custom' &&
      !bankAccounts.some((account) => account?.id === selectedBankAccountId)
    ) {
      if (
        primaryBankAccount.id &&
        bankAccounts.some((account) => account?.id === primaryBankAccount.id)
      ) {
        setSelectedBankAccountId(primaryBankAccount.id)
        return
      }

      setSelectedBankAccountId('custom')
    }
  }, [bankAccounts, primaryBankAccount.id, selectedBankAccountId])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const [_location, navigate] = useLocation()
  const createInvoice = trpcClient.invoices.create.useMutation()

  const formValues = form.watch()
  const invoiceItems = form.watch('items')
  const currency = form.watch('currency')
  const taxableFulfillmentDue = form.watch('taxable_fulfillment_due')
  const clientContactId = form.watch('client_contact_id')

  useExchangeRate({ currency, taxableFulfillmentDue, form })

  useEffect(() => {
    if (clientContactId && contacts) {
      const selectedContact = contacts.find(
        (contact) => contact.id === clientContactId
      )

      if (selectedContact) {
        form.setValue('language', selectedContact.language)
        form.setValue('currency', selectedContact.currency)
      }
    }
  }, [clientContactId, contacts, form])

  const total = invoiceItems.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )
  const totalVat = invoiceItems.reduce(
    (acc, item) =>
      acc +
      ((item.quantity ?? 0) *
        (item.unit_price ?? 0) *
        (!invoicingDetails?.vat_payer ? 0 : (item.vat_rate ?? 0))) /
        100,
    0
  )

  if (!invoicingDetails?.registration_no) {
    return (
      <div>
        <p>Nejprve si musíte vyplnit fakturační údaje</p>
        <Button
          className="mt-4"
          onClick={() => {
            navigate('/my-details')
          }}
        >
          Vyplnit fakturační údaje
        </Button>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div>
        <p>Ještě si musíte vytvořit aspoň jeden kontakt</p>
        <Button
          className="mt-4"
          onClick={() => {
            navigate('/contacts/new')
          }}
        >
          Vytvořit kontakt
        </Button>
      </div>
    )
  }

  const contact = contacts.find(
    (contact) => contact.id === formValues.client_contact_id
  )
  const isCzkInvoice = formValues.currency !== 'CZK'
  const exchangeRate = formValues.exchange_rate ?? 1
  const dueDate = djs(formValues.taxable_fulfillment_due)
  const { workingDays, hours, month } = getMonthWorkingDays(
    dueDate.month(),
    dueDate.year()
  )
  return (
    <div>
      <div className="mb-5 flex justify-between items-start">
        <h2>Nová faktura</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <LucideClock className="w-4 h-4" />
          <span>
            {month}:{' '}
            <button
              type="button"
              onClick={() => {
                form.setValue('items.0.quantity', workingDays)
                form.setValue('items.0.unit', 'manday')
              }}
              className="hover:text-blue-600 hover:underline cursor-pointer"
            >
              {workingDays} pracovních dní
            </button>{' '}
            (
            <button
              type="button"
              onClick={() => {
                form.setValue('items.0.quantity', hours)
                form.setValue('items.0.unit', 'hodin')
              }}
              className="hover:text-blue-600 hover:underline cursor-pointer"
            >
              {hours} hodin
            </button>
            )
          </span>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            if (!contact) {
              alert('Kontakt nenalezen')
              return
            }

            if (!values.client_contact_id) {
              alert('Vyberte kontakt')
              return
            }

            const { items, ...invoiceData } = values

            const newInvoiceId = await createInvoice.mutateAsync({
              invoice: {
                ...invoiceData,
                client_contact_id: contact.id,
                issued_on: djs(invoiceData.issued_on).format('YYYY-MM-DD'),
                taxable_fulfillment_due: djs(
                  invoiceData.taxable_fulfillment_due
                ).format('YYYY-MM-DD')
              },
              items: items
            })

            navigate(`/invoices/${newInvoiceId}`)
          })}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Číslo faktury</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col grow col-span-2">
                  <FormLabel>Odběratel</FormLabel>
                  <div className="flex flex-row justify-between">
                    <div className="grow flex flex-col grow">
                      <FormControl>
                        <ContactComboBox
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                        />
                      </FormControl>
                    </div>
                    <ButtonLink
                      type="button"
                      tabIndex={100}
                      href="/contacts/new?next=/new-invoice"
                    >
                      Nový kontakt
                    </ButtonLink>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issued_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum vystavení faktury</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value ? djs(field.value).toDate() : undefined}
                      setDate={(date) => {
                        field.onChange(
                          date ? djs(date).format('YYYY-MM-DD') : ''
                        )
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxable_fulfillment_due"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum zdanitelného plnění</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value ? djs(field.value).toDate() : undefined}
                      setDate={(date) => {
                        field.onChange(
                          date ? djs(date).format('YYYY-MM-DD') : ''
                        )
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_in_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Splatnost (v dnech)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Způsob platby</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Měna</FormLabel>
                  <FormControl>
                    <CurrencySelect
                      {...field}
                      name="currency"
                      placeholder="CZK"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isCzkInvoice && (
              <FormField
                control={form.control}
                name="exchange_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kurz</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const parsedValue = parseLocalizedFloat(
                            e.target.value
                          )

                          field.onChange(parsedValue ?? null)
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="footer_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámka</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <BankDetailsAccordion
            control={form.control}
            bankAccounts={bankAccounts}
            selectedBankAccountId={selectedBankAccountId}
            onBankAccountChange={handleBankAccountChange}
          />

          <div className="flex flex-col gap-4 p-4 bg-white border rounded-md mt-6">
            <h3 className="flex items-center gap-2">Položky</h3>
            {fields.map((item, index) => {
              return (
                <InvoiceItemForm
                  key={item.id}
                  vatPayer={invoicingDetails?.vat_payer}
                  control={form.control}
                  index={index}
                  onDelete={() => remove(index)}
                  contacts={contacts}
                  selectedContactId={formValues.client_contact_id}
                />
              )
            })}

            <div className="flex gap-4">
              <Button
                type="button"
                className="flex items-center gap-2 bg-green-500 text-white"
                onClick={() => {
                  append(defaultInvoiceItem)
                }}
              >
                <LucidePlus className="text-white" />
                Další položka
              </Button>
            </div>
          </div>
          <InvoiceTotals
            total={total}
            vatPayer={invoicingDetails?.vat_payer}
            totalVat={totalVat}
            currency={formValues.currency}
            exchangeRate={exchangeRate}
            isCzkInvoice={isCzkInvoice}
          />
          <Center>
            <ButtonWithLoader
              autoFocus
              isLoading={createInvoice.isPending}
              disabled={!contact || total === 0}
              type="submit"
              tabIndex={-1}
            >
              Vytvořit fakturu a přejít na náhled a odeslání
            </ButtonWithLoader>
          </Center>
        </form>
      </Form>
    </div>
  )
}

import { RouterOutputs } from '@/lib/trpcClient'

type Contact = RouterOutputs['contacts']['all'][number]

const InvoiceItemForm = ({
  control,
  index,
  onDelete,
  vatPayer,
  contacts,
  selectedContactId
}: {
  control: Control<any>
  index: number
  onDelete: () => void
  vatPayer?: boolean
  contacts: Contact[]
  selectedContactId?: string
}) => {
  const { setValue } = useFormContext()
  const [showVatWarning, setShowVatWarning] = useState<boolean | null>(null)

  const handleConfirmZeroVat = () => {
    // User confirmed they want to use 0% VAT
    setShowVatWarning(false) // Set to false to never show again
    setValue(`items.${index}.vat_rate`, 0)
  }

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4 mb-4 md:border-none md:pb-0 md:mb-0 align-baseline items-end">
      <div className="sm:flex sm:flex-row gap-4 grow grid grid-cols-2 flex-wrap items-end">
        <div>
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor={`items.${index}.quantity`}
          >
            Množství
          </Label>
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <Input
                id={`items.${index}.quantity`}
                className="w-full sm:w-24"
                type="text"
                inputMode="decimal"
                placeholder="Množství"
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(parseLocalizedFloat(e.target.value))
                }}
              />
            )}
          />
        </div>

        <div>
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor={`items.${index}.unit`}
          >
            Jednotka
          </Label>
          <FormField
            control={control}
            name={`items.${index}.unit`}
            render={({ field }) => (
              <Input
                id={`items.${index}.unit`}
                placeholder="Jednotka"
                type="text"
                className="w-full sm:w-32"
                {...field}
                value={field.value || ''}
              />
            )}
          />
        </div>
        <div className="flex flex-col flex-1">
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor={`items.${index}.description`}
          >
            Popis položky
          </Label>
          <FormField
            control={control}
            name={`items.${index}.description`}
            render={({ field }) => (
              <Textarea
                id={`items.${index}.description`}
                className="w-full sm:w-96 md:flex-grow col-span-2 min-h-20"
                placeholder="Popis položky"
                rows={2}
                {...field}
                value={field.value || ''}
              />
            )}
          />
        </div>
      </div>
      <div className="flex gap-4 items-end">
        <div className="flex-grow sm:flex-grow-0">
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor={`items.${index}.unit_price`}
          >
            Cena/jedn.
          </Label>
          <FormField
            control={control}
            name={`items.${index}.unit_price`}
            render={({ field }) => (
              <Input
                id={`items.${index}.unit_price`}
                className="w-full sm:w-32"
                placeholder="Cena/jedn."
                type="text"
                inputMode="decimal"
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(parseLocalizedFloat(e.target.value))
                }}
              />
            )}
          />
        </div>
        {vatPayer && (
          <div className="flex-grow sm:flex-grow-0">
            <Label
              className="text-xs text-gray-500 mb-1 block md:block"
              htmlFor={`items.${index}.vat_rate`}
            >
              DPH %
            </Label>
            <FormField
              control={control}
              name={`items.${index}.vat_rate`}
              render={({ field }) => (
                <Input
                  id={`items.${index}.vat_rate`}
                  className="w-full sm:w-20"
                  placeholder="DPH %"
                  type="text"
                  inputMode="decimal"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const vatRate = parseLocalizedFloat(e.target.value)

                    if (vatRate === undefined) {
                      field.onChange(undefined)
                      return
                    }

                    if (
                      vatRate === 0 &&
                      (field.value ?? 0) > 0 &&
                      selectedContactId &&
                      contacts
                        .find((c) => c.id === selectedContactId)
                        ?.vat_no?.startsWith('CZ') &&
                      showVatWarning !== false
                    ) {
                      setShowVatWarning(true)
                    } else {
                      field.onChange(vatRate)
                    }
                  }}
                />
              )}
            />
          </div>
        )}
        <div>
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded hover:bg-gray-300 flex-shrink-0"
            onClick={onDelete}
          >
            <LucideTrash2 className="text-gray-600" />
          </button>
        </div>
      </div>

      <Dialog
        open={showVatWarning === true}
        onOpenChange={(open) => {
          if (!open) {
            setShowVatWarning(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upozornění</DialogTitle>
            <DialogDescription>
              Nulová DPH pro tuzemskou fakturu lze použít pouze pro omezené typy
              zboží a služeb. Zde je jejich výčet:{' '}
              <a
                href="https://financnisprava.gov.cz/cs/financni-sprava/media-a-verejnost/tiskove-zpravy-gfr/tiskove-zpravy-2017/od-cervence-dochazi-k-rozsireni-rezimu-reverse-charge-na-dalsi-plneni"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                https://financnisprava.gov.cz/cs/financni-sprava/media-a-verejnost/tiskove-zpravy-gfr/tiskove-zpravy-2017/od-cervence-dochazi-k-rozsireni-rezimu-reverse-charge-na-dalsi-plneni
              </a>
              <p className="mt-4">
                V xml exportu kontrolního hlášení bude tato faktura v sekci A.1
                a budete muset ručně doplnit kód plnění
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVatWarning(null)
              }}
            >
              Zrušit
            </Button>
            <Button onClick={handleConfirmZeroVat}>
              Rozumím, pokračovat s 0% DPH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
