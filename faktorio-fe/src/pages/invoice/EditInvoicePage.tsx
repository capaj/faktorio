import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { djs } from 'faktorio-shared/src/djs'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import {
  invoiceForRenderSchema,
  useInvoiceQueryByUrlParam
} from '../InvoiceDetail/InvoiceDetailPage'
import { getInvoiceSums } from 'faktorio-api/src/routers/invoices/getInvoiceSums'
import { useDebounceValue } from 'usehooks-ts'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'
import { BankDetailsAccordion } from './BankDetailsAccordion'
import { DatePicker } from '@/components/ui/date-picker'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { CurrencySelect } from '@/components/ui/currency-select'
import { InvoiceTotals } from './InvoiceTotals'
// import removed: InvoicingDetailsFormSchema
import { Label } from '@/components/ui/label'
import type { UserBankAccountSelectType } from 'faktorio-api/src/zodDbSchemas'

export const EditInvoicePage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()
  const contactsQuery = trpcClient.contacts.all.useQuery()

  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()
  const bankAccounts = (invoicingDetails?.bankAccounts ??
    []) as UserBankAccountSelectType[]
  const normalizeValue = (value?: string | null) =>
    (value ?? '').replace(/\s+/g, '').toUpperCase()
  const matchesField = (
    accountValue?: string | null,
    fieldValue?: string | null
  ) => {
    const normalizedAccount = normalizeValue(accountValue)
    const normalizedField = normalizeValue(fieldValue)
    return normalizedAccount !== '' && normalizedAccount === normalizedField
  }
  const getMatchingAccountId = ({
    bank_account,
    iban,
    swift_bic
  }: {
    bank_account?: string | null
    iban?: string | null
    swift_bic?: string | null
  }) => {
    const match = bankAccounts.find((account) => {
      if (!account?.id) {
        return false
      }

      return (
        matchesField(account.bank_account, bank_account) ||
        matchesField(account.iban, iban) ||
        matchesField(account.swift_bic, swift_bic)
      )
    })

    return match?.id ?? 'custom'
  }
  const [_previewInvoice, setPreviewInvoice] = useDebounceValue<z.infer<
    typeof invoiceForRenderSchema
  > | null>(null, 3000)

  const form = useForm({
    // resolver: zodResolver(formSchema),
    defaultValues: invoice
  })

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(
    () => getMatchingAccountId(invoice)
  )

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const [_location, navigate] = useLocation()
  const updateInvoice = trpcClient.invoices.update.useMutation()
  const contact = contactsQuery.data?.find(
    (contact) => contact.id === invoice.client_contact_id
  )

  const formValues = form.watch()
  const invoiceItems = form.watch('items')
  const currency = form.watch('currency')
  const taxableFulfillmentDue = form.watch('taxable_fulfillment_due')
  const bankAccountValue = form.watch('bank_account')
  const ibanValue = form.watch('iban')
  const swiftBicValue = form.watch('swift_bic')
  const isDirty = form.formState.isDirty

  useExchangeRate({ currency, taxableFulfillmentDue, form })

  useEffect(() => {
    if (selectedBankAccountId === 'custom') {
      return
    }

    const account = bankAccounts.find(
      (item) => item?.id === selectedBankAccountId
    )

    if (!account) {
      setSelectedBankAccountId('custom')
      return
    }

    const stillMatches =
      matchesField(account.bank_account, bankAccountValue) ||
      matchesField(account.iban, ibanValue) ||
      matchesField(account.swift_bic, swiftBicValue)

    if (!stillMatches) {
      setSelectedBankAccountId('custom')
    }
  }, [
    bankAccounts,
    selectedBankAccountId,
    bankAccountValue,
    ibanValue,
    swiftBicValue
  ])

  useEffect(() => {
    if (selectedBankAccountId !== 'custom') {
      return
    }

    if (isDirty) {
      return
    }

    const matchId = getMatchingAccountId({
      bank_account: bankAccountValue,
      iban: ibanValue,
      swift_bic: swiftBicValue
    })

    if (matchId !== 'custom') {
      setSelectedBankAccountId(matchId)
    }
  }, [
    selectedBankAccountId,
    isDirty,
    bankAccountValue,
    ibanValue,
    swiftBicValue,
    bankAccounts
  ])

  useEffect(() => {
    if (selectedBankAccountId === 'custom') {
      return
    }

    if (bankAccounts.some((account) => account?.id === selectedBankAccountId)) {
      return
    }

    setSelectedBankAccountId('custom')
  }, [bankAccounts, selectedBankAccountId])

  const handleBankAccountChange = (accountId: string) => {
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
    const maybeUpdate = (
      field: 'bank_account' | 'iban' | 'swift_bic',
      nextValue: string
    ) => {
      if (form.getValues(field) !== nextValue) {
        form.setValue(field, nextValue, { shouldDirty: true })
      }
    }

    maybeUpdate('bank_account', ensureString(account.bank_account))
    maybeUpdate('iban', ensureString(account.iban))
    maybeUpdate('swift_bic', ensureString(account.swift_bic))
  }

  const total = invoiceItems.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )
  const totalVat = invoicingDetails?.vat_payer
    ? invoiceItems.reduce(
        (acc, item) =>
          acc +
          ((item.quantity ?? 0) *
            (item.unit_price ?? 0) *
            (item.vat_rate ?? 0)) /
            100,
        0
      )
    : 0

  if (contactsQuery.data?.length === 0) {
    return null
  }

  const createDefaultInvoiceItem = (order: number) => ({
    description: '',
    unit: 'manday',
    quantity: 1,
    unit_price: 0,
    vat_rate: formValues.currency === 'CZK' ? 21 : 0,
    id: 0,
    created_at: '',
    updated_at: null,
    order,
    invoice_id: ''
  })

  useEffect(() => {
    const invoiceCompleteForPreview = {
      ...formValues,
      ...getInvoiceSums(invoiceItems, formValues.exchange_rate ?? 1),
      items: invoiceItems.map((item) => ({
        ...item,
        quantity: item.quantity ?? undefined,
        unit_price: item.unit_price ?? undefined,
        vat_rate: item.vat_rate ?? undefined
      })),
      due_on: djs(formValues.issued_on)
        .add(formValues.due_in_days, 'day')
        .format('YYYY-MM-DD'),
      your_name: invoice.your_name ?? '',
      client_contact_id: invoice.client_contact_id
    }
    setPreviewInvoice(invoiceCompleteForPreview)
  }, [formValues, invoiceItems])

  const isCzkInvoice = formValues.currency !== 'CZK'
  const exchangeRate = formValues.exchange_rate ?? 1

  return (
    <div>
      <h2 className="mb-5">Upravit fakturu {invoice.number}</h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            if (!invoice.id) {
              alert('Faktura nebyla nalezena')
              return
            }

            if (!contact) {
              alert('Kontakt nenalezen')
              return
            }

            // Convert all date fields to YYYY-MM-DD string format
            // to avoid timezone issues when serializing/deserializing
            const formattedInvoice = {
              ...values,
              issued_on: djs(values.issued_on).format('YYYY-MM-DD'),
              taxable_fulfillment_due: djs(
                values.taxable_fulfillment_due
              ).format('YYYY-MM-DD')
            }

            await updateInvoice.mutateAsync({
              id: invoice.id,
              invoice: {
                ...formattedInvoice,
                client_contact_id: contact.id
              },
              items: values.items
            })

            navigate(`/invoices/${invoice.id}`)
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
                <FormItem className="flex flex-col flew-grow col-span-2">
                  <FormLabel>Odběratel</FormLabel>
                  <FormControl>
                    <ContactComboBox disabled {...field} />
                  </FormControl>
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
                        type="number"
                        min={0}
                        step={0.01}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v === '' ? null : Number(v))
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
                  control={form.control}
                  invoicingDetails={invoicingDetails}
                  index={index}
                  onDelete={() => remove(index)}
                />
              )
            })}

            <div className="flex gap-4">
              <Button
                type="button"
                className="flex items-center gap-2 bg-green-500 text-white"
                onClick={() => {
                  append(createDefaultInvoiceItem(fields.length))
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
          <Center className="mb-8 flex gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={updateInvoice.isPending || !form.formState.isDirty}
              onClick={() => {
                form.reset(invoice)
              }}
            >
              Zrušit změny
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(event) => {
                event.preventDefault()

                if (
                  form.formState.isDirty &&
                  !confirm('Pokud odejdete na náhled, změna se ztratí!')
                ) {
                  return
                }

                navigate(`/invoices/${invoice.id}`)
              }}
            >
              Zobrazit fakturu (bez uložení změn!)
            </Button>
            <ButtonWithLoader
              isLoading={updateInvoice.isPending}
              disabled={!form.formState.isDirty || updateInvoice.isPending}
              type="submit"
            >
              Uložit změny na faktuře
            </ButtonWithLoader>
          </Center>
        </form>
      </Form>
      {/* {previewInvoice && <InvoiceDetail invoice={previewInvoice} />} */}
    </div>
  )
}

const InvoiceItemForm = ({
  control,
  index,
  onDelete,
  invoicingDetails
}: {
  control: any
  index: number
  invoicingDetails: { vat_payer?: boolean } | null
  onDelete: () => void
}) => {
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
                className="w-full sm:w-24"
                type="number"
                min={0}
                placeholder="Množství"
                {...field}
                value={field.value || ''}
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
                placeholder="Jednotka"
                type="text"
                className="w-full sm:w-32"
                {...field}
                value={field.value || ''}
              />
            )}
          />
        </div>
        <FormField
          control={control}
          name={`items.${index}.description`}
          render={({ field }) => (
            <Input
              className="w-full sm:w-96 md:grow col-span-2"
              placeholder="Popis položky"
              type="text"
              {...field}
              value={field.value || ''}
            />
          )}
        />
      </div>
      <div className="flex gap-4 items-end">
        <div className="grow sm:grow-0">
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
                className="w-full sm:w-32"
                placeholder="Cena/jedn."
                type="number"
                step="0.01"
                {...field}
                value={field.value || ''}
              />
            )}
          />
        </div>
        {invoicingDetails?.vat_payer && (
          <div className="grow sm:grow-0">
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
                  className="w-full sm:w-20"
                  placeholder="DPH %"
                  type="number"
                  min={0}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
          </div>
        )}
        <div>
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded hover:bg-gray-300 shrink-0"
            onClick={onDelete}
          >
            <LucideTrash2 className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
