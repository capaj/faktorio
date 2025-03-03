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
import { invoiceItemFormSchema } from '../../../../faktorio-api/src/zodDbSchemas'
import { useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

const defaultInvoiceItem = {
  description: '',
  unit: 'manday',
  quantity: 1,
  unit_price: 0,
  vat_rate: 21
}

export const NewInvoice = () => {
  const [lastInvoice] = trpcClient.invoices.lastInvoice.useSuspenseQuery()
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()
  const utils = trpcClient.useUtils()

  const invoiceOrdinal =
    parseInt(lastInvoice?.number?.split('-')[1] ?? '0', 10) + 1
  const nextInvoiceNumber = `${djs().format('YYYY')}-${invoiceOrdinal.toString().padStart(3, '0')}`
  const formSchema = getInvoiceCreateSchema(nextInvoiceNumber)
    .omit({
      client_contact_id: true
    })
    .extend({
      client_contact_id: z.string().optional()
    })
  const [location, navigate] = useLocation()
  const createInvoice = trpcClient.invoices.create.useMutation()

  // Create a separate schema for bank account fields
  const bankAccountSchema = formSchema.pick({
    bank_account: true,
    iban: true,
    swift_bic: true
  })

  const [formValues, setFormValues] = useState<z.infer<typeof formSchema>>(
    formSchema.parse({
      due_in_days: 14,
      bank_account: invoicingDetails?.bank_account || '',
      iban: invoicingDetails?.iban || '',
      swift_bic: invoicingDetails?.swift_bic || ''
    })
  )

  useEffect(() => {
    if (formValues.currency === 'CZK') {
      setFormValues((prev) => ({
        ...prev,
        exchange_rate: 1
      }))
      return
    }
    const fetchRate = async () => {
      const rate = await utils.invoices.getExchangeRate.fetch({
        currency: formValues.currency,
        date: formValues.taxable_fulfillment_due
      })
      if (rate !== null) {
        setFormValues((prev) => ({
          ...prev,
          exchange_rate: rate
        }))
      }
    }
    fetchRate()
  }, [formValues.currency])

  const [invoiceItems, setInvoiceItems] = useState<
    z.infer<typeof invoiceItemFormSchema>[]
  >([defaultInvoiceItem])

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

  if (contactsQuery.data?.length === 0) {
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

  const contact = contactsQuery.data?.find(
    (contact) => contact.id === formValues.client_contact_id
  )
  const isCzkInvoice = formValues.currency !== 'CZK'
  const exchangeRate = formValues.exchange_rate ?? 1
  return (
    <div>
      <h2 className="mb-5">Nová faktura</h2>

      <AutoForm
        formSchema={formSchema}
        values={formValues}
        containerClassName="grid grid-cols-2 gap-4"
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
          },
          client_contact_id: {
            label: 'Odběratel',
            fieldType: ({ field }) => {
              return <ContactComboBox {...field} />
            }
          },
          due_in_days: {
            label: 'Splatnost (v dnech)'
          },
          exchange_rate: {
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

      <Accordion type="single" collapsible className="mt-4 mb-6">
        <AccordionItem value="bank-details">
          <AccordionTrigger className="font-semibold">
            Bankovní údaje
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <AutoForm
                formSchema={bankAccountSchema}
                values={{
                  bank_account: formValues.bank_account,
                  iban: formValues.iban,
                  swift_bic: formValues.swift_bic
                }}
                onParsedValuesChange={(values) => {
                  setFormValues((prev) => ({
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
      <div className="grid grid-cols-2 gap-6 mt-8">
        <>
          {isCzkInvoice && (
            <span className="text-sm text-gray-500">
              Celkem: {total * exchangeRate} CZK
            </span>
          )}
          <h3
            className={`text-md text-right ${isCzkInvoice ? '' : 'col-span-2'}`}
          >
            Celkem: {total} {formValues.currency}
          </h3>
          {isCzkInvoice && (
            <span className="text-sm text-gray-500">
              DPH: {totalVat * exchangeRate} CZK
            </span>
          )}
          <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
            DPH: {totalVat} {formValues.currency}
          </h3>

          {isCzkInvoice && (
            <span className="text-sm text-gray-500">
              Celkem s DPH: {(total + totalVat) * exchangeRate} CZK
            </span>
          )}
          <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
            Celkem s DPH: {(total + totalVat).toFixed(2)} {formValues.currency}
          </h3>
        </>
      </div>
      <Center>
        <ButtonWithLoader
          isLoading={createInvoice.isLoading}
          disabled={!contact || total === 0}
          onClick={async () => {
            if (!contact) {
              alert('Kontakt nenalezen')
              return
            }

            if (!formValues.client_contact_id) {
              alert('Vyberte kontakt')
              return
            }

            const newInvoice = await createInvoice.mutateAsync({
              invoice: {
                ...formValues,
                client_contact_id: contact.id
              },
              items: invoiceItems
            })

            console.log('newInvoice:', newInvoice)
            navigate(`/invoices/${newInvoice}`)
          }}
        >
          Vytvořit fakturu a přejít na náhled a odeslání
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
    <div className="flex justify-between">
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
      <div className="flex gap-4">
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
