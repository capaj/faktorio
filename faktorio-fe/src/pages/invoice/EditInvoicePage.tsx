import AutoForm from '@/components/ui/auto-form'
import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { getInvoiceCreateSchema } from 'faktorio-api/src/routers/zodSchemas'
import { djs } from 'faktorio-shared/src/djs'
import { useZodFormState } from '@/lib/useZodFormState'
import { z } from 'zod'
import { invoiceItemFormSchema } from '../../../../faktorio-api/src/zodDbSchemas'
import { useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import {
  InvoiceDetail,
  invoiceForRenderSchema,
  useInvoiceQueryByUrlParam
} from '../InvoiceDetail/InvoiceDetailPage'
import { getInvoiceSums } from 'faktorio-api/src/routers/invoices/getInvoiceSums'
import { useDebounceValue } from 'usehooks-ts'
import { FormControl } from '@/components/ui/form'
import { FormItem } from '@/components/ui/form'
import { FormLabel } from '@/components/ui/form'
import { BankDetailsAccordion } from './BankDetailsAccordion'

export const EditInvoicePage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const [previewInvoice, setPreviewInvoice] = useDebounceValue<z.infer<
    typeof invoiceForRenderSchema
  > | null>(null, 3000)
  const formSchema = getInvoiceCreateSchema(
    invoice.number ?? djs().get('year').toString()
  )

  const [location, navigate] = useLocation()
  const updateInvoice = trpcClient.invoices.update.useMutation()
  const contact = contactsQuery.data?.find(
    (contact) => contact.id === invoice.client_contact_id
  )

  const [formValues, setFormValues] = useState<z.infer<typeof formSchema>>(
    formSchema.parse({
      ...invoice,
      client_contact_name: contact?.name
    })
  )

  const [invoiceItems, setInvoiceItems] = useState<
    z.infer<typeof invoiceItemFormSchema>[]
  >(invoice.items)

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
    vat_rate: formValues.currency === 'CZK' ? 21 : 0
  }

  useEffect(() => {
    const invoiceCompleteForPreview = {
      ...formValues,
      ...getInvoiceSums(invoiceItems, formValues.exchange_rate ?? 1),
      items: invoiceItems,
      due_on: djs(formValues.issued_on)
        .add(formValues.due_in_days, 'day')
        .format('YYYY-MM-DD'),
      your_name: invoice.your_name ?? '',
      client_contact_id: invoice.client_contact_id
    }
    setPreviewInvoice(invoiceCompleteForPreview)
  }, [formValues, invoiceItems])

  const isCzkInvoice = formValues.currency !== 'CZK'

  return (
    <div>
      <h2 className="mb-5">Upravit fakturu {invoice.number}</h2>

      <AutoForm
        formSchema={formSchema}
        values={formValues}
        containerClassName="grid grid-cols-2 md:grid-cols-3 gap-4"
        onParsedValuesChange={(values) => {
          setFormValues(values as z.infer<typeof formSchema>)
        }}
        fieldConfig={{
          currency: {
            label: 'Měna'
          },
          issued_on: {
            label: 'Datum vystavení faktury',
            fieldType: 'date'
          },
          number: {
            label: 'Číslo faktury'
          },
          payment_method: {
            label: 'Způsob platby'
          },
          taxable_fulfillment_due: {
            label: 'Datum zdanitelného plnění',
            fieldType: 'date'
          },
          footer_note: {
            label: 'Poznámka'
          },
          client_contact_id: {
            label: 'Odběratel',
            fieldType: ({ label, isRequired, field, fieldConfigItem }) => (
              <FormItem className="flex flex-col flew-grow col-span-2">
                <FormLabel>
                  {label}
                  {isRequired && (
                    <span className="text-destructive">{`\u00A0*`}</span>
                  )}
                </FormLabel>
                <FormControl>
                  <ContactComboBox {...field} />
                </FormControl>
              </FormItem>
            )
          },
          due_in_days: {
            label: 'Splatnost (v dnech)'
          },
          exchange_rate:
            formValues.currency === 'CZK'
              ? { fieldType: () => null }
              : {
                  inputProps: {
                    type: 'number',
                    min: 0,
                    disabled: !isCzkInvoice
                  },
                  label: 'Kurz'
                },
          // Hide bank account fields from the main form
          bank_account: {
            fieldType: () => null
          },
          iban: {
            fieldType: () => null
          },
          swift_bic: {
            fieldType: () => null
          }
        }}
      ></AutoForm>

      <BankDetailsAccordion
        formValues={formValues}
        setFormValues={setFormValues}
      />

      <div className="flex flex-col gap-4 p-4 bg-white border rounded-md mt-6">
        <h3 className="flex items-center gap-2">Položky</h3>
        {invoiceItems.map((item, index) => {
          return (
            <InvoiceItemForm
              key={index}
              data={item}
              onDelete={() => {
                setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
              }}
              onChange={(data) => {
                const newInvoiceItems = [...invoiceItems]
                newInvoiceItems[index] = data
                setInvoiceItems(newInvoiceItems)
              }}
            />
          )
        })}

        <div className="flex gap-4">
          <Button
            className="flex items-center gap-2 bg-green-500 text-white"
            onClick={() => {
              setInvoiceItems([...invoiceItems, defaultInvoiceItem])
            }}
          >
            <LucidePlus className="text-white" />
            Další položka
          </Button>
        </div>
      </div>
      <div className="flex gap-6 flex-col items-end justify-end mt-8">
        <h3>
          Celkem: {total} {formValues.currency}
        </h3>
        <h3>DPH: {totalVat} </h3>
        <h3>Celkem s DPH: {(total + totalVat).toFixed(2)} </h3>
      </div>
      <Center className="mb-8">
        <ButtonWithLoader
          isLoading={updateInvoice.isPending}
          onClick={async () => {
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
              ...formValues,
              issued_on: djs(formValues.issued_on).format('YYYY-MM-DD'),
              taxable_fulfillment_due: djs(
                formValues.taxable_fulfillment_due
              ).format('YYYY-MM-DD')
            }

            await updateInvoice.mutateAsync({
              id: invoice.id,
              invoice: {
                ...formattedInvoice,
                client_contact_id: contact.id
              },
              items: invoiceItems
            })

            navigate(`/invoices/${invoice.id}`)
          }}
        >
          Uložit změny na faktuře
        </ButtonWithLoader>
      </Center>
      {/* {previewInvoice && <InvoiceDetail invoice={previewInvoice} />} */}
    </div>
  )
}

const InvoiceItemForm = ({
  data,
  onDelete,
  onChange
}: {
  data: z.infer<typeof invoiceItemFormSchema>
  onDelete: () => void
  onChange: (data: z.infer<typeof invoiceItemFormSchema>) => void
}) => {
  const zodForm = useZodFormState(invoiceItemFormSchema, data)

  useEffect(() => {
    onChange(zodForm.formState)
  }, [zodForm.formState])

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4">
      <div className="flex gap-4">
        <Input
          className="w-[190px]"
          type="number"
          min={0}
          {...zodForm.inputProps('quantity')}
        />
        <Input
          placeholder="jednotka"
          type="text"
          className="w-[190px]"
          {...zodForm.inputProps('unit')}
        />
        <Input
          className="w-full"
          placeholder="popis položky"
          type="text"
          {...zodForm.inputProps('description')}
        />
      </div>
      <div className="flex gap-4 justify-end">
        <Input
          className="w-32"
          placeholder="cena"
          type="text"
          {...zodForm.inputProps('unit_price')}
        />
        <Input
          className="w-20"
          placeholder="DPH"
          type="number"
          min={0}
          {...zodForm.inputProps('vat_rate')}
        />
        <button
          className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded hover:bg-gray-300"
          onClick={onDelete}
        >
          <LucideTrash2 className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}
