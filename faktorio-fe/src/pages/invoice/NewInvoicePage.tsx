import AutoForm from '@/components/ui/auto-form'
import { trpcClient } from '@/lib/trpcClient'

import { ContactComboBox } from './ContactComboBox'
import { LucidePlus, LucideTrash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button, ButtonWithLoader } from '@/components/ui/button'
import { getInvoiceCreateSchema } from 'faktorio-api/src/routers/zodSchemas'
import { djs } from 'faktorio-shared/src/djs'
import { useZodFormState } from '@/lib/useZodFormState'
import { z } from 'zod/v4'
import { invoiceItemFormSchema } from 'faktorio-api/src/zodDbSchemas'
import { useEffect, useState } from 'react'
import { Center } from '../../components/Center'
import { useLocation } from 'wouter'
import { FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { BankDetailsAccordion } from './BankDetailsAccordion'
import { createDateFieldConfig } from './dateFieldConfig'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'

const defaultInvoiceItem = {
  description: '',
  unit: 'manday',
  quantity: 1,
  unit_price: 0,
  vat_rate: 21
}

export const NewInvoicePage = () => {
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
      client_contact_id: z.string().optional(),
      language: z.string().default('cs')
    })
  const [location, navigate] = useLocation()
  const createInvoice = trpcClient.invoices.create.useMutation()

  const [formValues, setFormValues] = useState<z.infer<typeof formSchema>>(
    formSchema.parse({
      due_in_days: 14,
      bank_account: invoicingDetails?.bank_account || '',
      iban: invoicingDetails?.iban || '',
      swift_bic: invoicingDetails?.swift_bic || '',
      language: 'cs'
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
        date: djs(formValues.taxable_fulfillment_due).format('YYYY-MM-DD')
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

  useEffect(() => {
    if (formValues.client_contact_id && contactsQuery.data) {
      const selectedContact = contactsQuery.data.find(
        (contact) => contact.id === formValues.client_contact_id
      )

      if (selectedContact) {
        setFormValues((prev) => ({
          ...prev,
          language: selectedContact.language,
          currency: selectedContact.currency
        }))
      }
    }
  }, [formValues.client_contact_id, contactsQuery.data])

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
        containerClassName="grid grid-cols-2 md:grid-cols-3 gap-4"
        onParsedValuesChange={(values) => {
          setFormValues(values as z.infer<typeof formSchema>)
        }}
        fieldConfig={{
          currency: {
            label: 'Měna'
          },
          issued_on: createDateFieldConfig('Datum vystavení faktury'),
          number: {
            label: 'Číslo faktury'
          },
          payment_method: {
            label: 'Způsob platby'
          },
          taxable_fulfillment_due: createDateFieldConfig(
            'Datum zdanitelného plnění'
          ),
          footer_note: {
            label: 'Poznámka'
          },
          client_contact_id: {
            label: 'Odběratel',
            fieldType: ({ label, isRequired, field }) => (
              <FormItem className="flex flex-col flew-grow">
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
                  fieldType: ({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Kurz
                        <span className="text-destructive">{`\u00A0*`}</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={false}
                          {...field}
                          value={field.value ?? ''}
                          onBlur={(e) => {
                            const value = e.target.value
                            const numValue = parseFloat(value)
                            field.onChange(isNaN(numValue) ? null : numValue)
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )
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
        <h4 className="flex items-center gap-2">Položky</h4>
        {invoiceItems.map((item, index) => {
          return (
            <InvoiceItemForm
              key={index}
              data={item}
              contactsQuery={contactsQuery}
              selectedContactId={formValues.client_contact_id}
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
              Celkem: {(total * exchangeRate).toFixed(2)} CZK
            </span>
          )}
          <h3
            className={`text-md text-right ${isCzkInvoice ? '' : 'col-span-2'}`}
          >
            Celkem: {total.toFixed(2)} {formValues.currency}
          </h3>
          {isCzkInvoice && (
            <span className="text-sm text-gray-500">
              DPH: {(totalVat * exchangeRate).toFixed(2)} CZK
            </span>
          )}
          <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
            DPH: {totalVat.toFixed(2)} {formValues.currency}
          </h3>

          {isCzkInvoice && (
            <span className="text-sm text-gray-500">
              Celkem s DPH: {((total + totalVat) * exchangeRate).toFixed(2)} CZK
            </span>
          )}
          <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
            Celkem s DPH: {(total + totalVat).toFixed(2)} {formValues.currency}
          </h3>
        </>
      </div>
      <Center>
        <ButtonWithLoader
          isLoading={createInvoice.isPending}
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
  onChange,
  contactsQuery,
  selectedContactId
}: {
  data: z.infer<typeof invoiceItemFormSchema>
  onDelete: () => void
  onChange: (data: z.infer<typeof invoiceItemFormSchema>) => void
  contactsQuery: any
  selectedContactId?: string
}) => {
  const zodForm = useZodFormState(invoiceItemFormSchema, data)
  const [showVatWarning, setShowVatWarning] = useState<boolean | null>(null)

  useEffect(() => {
    onChange(zodForm.formState)
  }, [zodForm.formState])

  const handleVatRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vatRate = parseFloat(e.target.value)

    // Check if VAT rate is 0 and contact is Czech, but only if warning hasn't been dismissed
    if (
      vatRate === 0 &&
      selectedContactId &&
      contactsQuery.data &&
      showVatWarning !== false
    ) {
      const selectedContact = contactsQuery.data.find(
        (contact: any) => contact.id === selectedContactId
      )

      if (selectedContact?.vat_no?.startsWith('CZ')) {
        setShowVatWarning(true)
        return
      }
    }

    // If not a problematic case, proceed with normal change
    zodForm.inputProps('vat_rate').onChange(e)
  }

  const handleConfirmZeroVat = () => {
    // User confirmed they want to use 0% VAT
    setShowVatWarning(false) // Set to false to never show again

    zodForm.setField('vat_rate', 0)
  }

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4 mb-4 md:border-none md:pb-0 md:mb-0 align-baseline items-end">
      <div className="sm:flex sm:flex-row gap-4 flex-grow grid grid-cols-2 flex-wrap items-end">
        <div>
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor="quantity"
          >
            Množství
          </Label>
          <Input
            className="w-full sm:w-24"
            type="number"
            min={0}
            placeholder="Množství"
            {...zodForm.inputProps('quantity')}
          />
        </div>

        <div>
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor="unit"
          >
            Jednotka
          </Label>
          <Input
            placeholder="Jednotka"
            type="text"
            className="w-full sm:w-32"
            {...zodForm.inputProps('unit')}
          />
        </div>
        <Input
          className="w-full sm:w-96 md:flex-grow col-span-2"
          placeholder="Popis položky"
          type="text"
          {...zodForm.inputProps('description')}
        />
      </div>
      <div className="flex gap-4 items-end">
        <div className="flex-grow sm:flex-grow-0">
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor="unit_price"
          >
            Cena/jedn.
          </Label>
          <Input
            className="w-full sm:w-32"
            placeholder="Cena/jedn."
            type="text"
            {...zodForm.inputProps('unit_price')}
          />
        </div>
        <div className="flex-grow sm:flex-grow-0">
          <Label
            className="text-xs text-gray-500 mb-1 block md:block"
            htmlFor="vat_rate"
          >
            DPH %
          </Label>
          <Input
            className="w-full sm:w-20"
            placeholder="DPH %"
            type="number"
            min={0}
            {...zodForm.inputProps('vat_rate')}
            onChange={handleVatRateChange}
          />
        </div>
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
