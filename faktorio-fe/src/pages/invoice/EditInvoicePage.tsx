import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { djs } from 'faktorio-shared/src/djs'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { useEffect } from 'react'
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

export const EditInvoicePage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const [_previewInvoice, setPreviewInvoice] = useDebounceValue<z.infer<
    typeof invoiceForRenderSchema
  > | null>(null, 3000)

  const form = useForm({
    // resolver: zodResolver(formSchema),
    defaultValues: invoice
  })

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

  useExchangeRate({ currency, taxableFulfillmentDue, form })

  const total = invoiceItems.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )
  const totalVat = invoiceItems.reduce(
    (acc, item) =>
      acc +
      ((item.quantity ?? 0) * (item.unit_price ?? 0) * (item.vat_rate ?? 0)) /
        100,
    0
  )

  if (contactsQuery.data?.length === 0) {
    return null
  }

  const defaultInvoiceItem = {
    description: '',
    unit: 'manday',
    quantity: 1,
    unit_price: 0,
    vat_rate: formValues.currency === 'CZK' ? 21 : 0,
    id: 0,
    created_at: '',
    updated_at: null,
    order: null,
    invoice_id: ''
  }

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
                    <ContactComboBox {...field} />
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
                        value={field.value || ''}
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

          <BankDetailsAccordion control={form.control} />

          <div className="flex flex-col gap-4 p-4 bg-white border rounded-md mt-6">
            <h3 className="flex items-center gap-2">Položky</h3>
            {fields.map((item, index) => {
              return (
                <InvoiceItemForm
                  key={item.id}
                  control={form.control}
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
  onDelete
}: {
  control: any
  index: number
  onDelete: () => void
}) => {
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4">
      <div className="flex gap-4">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <Input
              className="w-[190px]"
              type="number"
              min={0}
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.unit`}
          render={({ field }) => (
            <Input
              placeholder="jednotka"
              type="text"
              className="w-[190px]"
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.description`}
          render={({ field }) => (
            <Input
              className="w-full"
              placeholder="popis položky"
              type="text"
              {...field}
              value={field.value || ''}
            />
          )}
        />
      </div>
      <div className="flex gap-4 justify-end">
        <FormField
          control={control}
          name={`items.${index}.unit_price`}
          render={({ field }) => (
            <Input
              className="w-32"
              placeholder="cena"
              type="number"
              step="0.01"
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.vat_rate`}
          render={({ field }) => (
            <Input
              className="w-20"
              placeholder="DPH"
              type="number"
              min={0}
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <button
          type="button"
          className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded hover:bg-gray-300"
          onClick={onDelete}
        >
          <LucideTrash2 className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}
