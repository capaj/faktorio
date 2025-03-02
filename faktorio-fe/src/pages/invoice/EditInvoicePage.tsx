import AutoForm from '@/components/ui/auto-form'
import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { getInvoiceCreateSchema } from './getInvoiceCreateSchema'
import { djs } from '../../../../src/djs'
import { useZodFormState } from '@/lib/useZodFormState'
import { z } from 'zod'
import {
  invoiceItemFormSchema} from '../../../../faktorio-api/src/zodDbSchemas'
import { useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import { useInvoiceQueryByUrlParam } from '../InvoiceDetail/InvoiceDetailPage'

const defaultInvoiceItem = {
  description: '',
  unit: 'manday',
  quantity: 1,
  unit_price: 0,
  vat_rate: 21
}

export const EditInvoicePage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()
  const contactsQuery = trpcClient.contacts.all.useQuery()

  const formSchema = getInvoiceCreateSchema(
    invoice.number ?? djs().get('year').toString()
  ).omit({
    client_contact_id: true
  })


  const [location, navigate] = useLocation()
  const updateInvoice = trpcClient.invoices.update.useMutation()
  const contact = contactsQuery.data?.find(
    (contact) => contact.id === invoice.client_contact_id
  )
  console.log('contact', contact)
  const [formValues, setFormValues] = useState<z.infer<typeof formSchema>>(
    formSchema.parse({
      ...invoice,
      client_contact_name: contact?.name,
      issued_on: invoice.issued_on ? new Date(invoice.issued_on) : new Date(),
      taxable_fulfillment_due: invoice.taxable_fulfillment_due
        ? new Date(invoice.taxable_fulfillment_due)
        : new Date()
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

  return (
    <div>
      <h2 className="mb-5">Upravit fakturu {invoice.number}</h2>

      <AutoForm
        containerClassName="grid grid-cols-2 gap-4"
        formSchema={formSchema}
        values={formValues}
        onParsedValuesChange={(values) => {
          setFormValues(values as z.infer<typeof formSchema>)
        }}
        fieldConfig={{
          currency: {
            label: 'Měna'
          },
          issued_on: {
            label: 'Datum vystavení faktury'
          },
          number: {
            label: 'Číslo faktury',
            inputProps: {
              disabled: true
            }
          },
          payment_method: {
            label: 'Způsob platby'
          },
          taxable_fulfillment_due: {
            label: 'Datum zdanitelného plnění'
          },
          footer_note: {
            label: 'Poznámka'
          },
          due_in_days: {
            label: 'Splatnost (v dnech)'
          }
        }}
      ></AutoForm>

      {contact?.name && (
        <ContactComboBox disabled={true} value={contact.name} />
      )}
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
      <Center>
        <ButtonWithLoader
          isLoading={updateInvoice.isLoading}
          onClick={async () => {
            if (!invoice.id) {
              alert('Faktura nebyla nalezena')
              return
            }

            if (!contact) {
              alert('Kontakt nenalezen')
              return
            }
            await updateInvoice.mutateAsync({
              id: invoice.id,
              invoice: {
                ...formValues,
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
