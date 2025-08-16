import {
  AresBusinessInformationSchema,
  formatStreetAddress
} from './ContactList/ContactList'
import { ContactForm } from './ContactList/ContactForm'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'
import { useEffect } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { z } from 'zod/v4'

const invoicingDetailsFormSchema = z.object({
  registration_no: z.string().optional(),
  name: z.string().min(1, 'Jméno je povinné'),
  vat_no: z.string().optional(),
  street: z.string().min(1, 'Ulice je povinná'),
  street2: z.string().optional(),
  city: z.string().min(1, 'Město je povinné'),
  zip: z.string().min(1, 'PSČ je povinné'),
  country: z.string().min(1, 'Země je povinná'),
  main_email: z.string().optional(),
  phone_number: z.string().optional(),
  iban: z.string().optional(),
  swift_bic: z.string().optional(),
  bank_account: z.string().optional(),
  web_url: z.string().optional(),
  language: z.string().optional(),
  vat_payer: z.boolean().optional().default(true)
})

export type InvoicingDetailsFormSchema = z.infer<
  typeof invoicingDetailsFormSchema
>

export const UserInvoicingDetails = () => {
  const [data, { refetch }] = trpcClient.invoicingDetails.useSuspenseQuery()

  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  const [isLoadingAres, setIsLoadingAres] = useState(false)

  // Initialize form with react-hook-form
  const form = useForm<InvoicingDetailsFormSchema>({
    resolver: zodResolver(invoicingDetailsFormSchema),
    defaultValues: {
      registration_no: data?.registration_no || '',
      name: data?.name || '',
      vat_no: data?.vat_no || '',
      street: data?.street || '',
      street2: data?.street2 || '',
      city: data?.city || '',
      zip: data?.zip || '',
      country: data?.country || 'Česká Republika',
      main_email: data?.main_email || '',
      phone_number: data?.phone_number || '',
      iban: data?.iban || '',
      swift_bic: data?.swift_bic || '',
      bank_account: data?.bank_account || '',
      web_url: data?.web_url || '',
      vat_payer: data?.vat_payer || true,
      language: 'cs'
    }
  })

  // Update form when data changes
  useEffect(() => {
    if (data) {
      form.reset({
        registration_no: data.registration_no || '',
        name: data.name || '',
        vat_no: data.vat_no || '',
        street: data.street || '',
        street2: data.street2 || '',
        city: data.city || '',
        zip: data.zip || '',
        country: data.country || 'Česká Republika',
        main_email: data.main_email || '',
        phone_number: data.phone_number || '',
        iban: data.iban || '',
        swift_bic: data.swift_bic || '',
        bank_account: data.bank_account || '',
        web_url: data.web_url || '',
        vat_payer: data.vat_payer || true,
        language: 'cs'
      })
    }
  }, [data, form])

  const fetchAresData = async () => {
    const registrationNo = form.getValues('registration_no')
    if (!registrationNo || registrationNo.length !== 8) return

    setIsLoadingAres(true)
    try {
      console.log('Fetching ARES data...', registrationNo)
      const aresResponse = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${registrationNo}`
      )
      const parse = AresBusinessInformationSchema.safeParse(
        await aresResponse.json()
      )
      console.log('parse', parse)
      if (parse.success) {
        const aresData = parse.data
        console.log('aresData', aresData)
        form.setValue('name', aresData.obchodniJmeno)
        form.setValue('street', formatStreetAddress(aresData))
        form.setValue('street2', aresData.sidlo.nazevCastiObce)
        form.setValue('city', aresData.sidlo.nazevObce)
        form.setValue('zip', String(aresData.sidlo.psc))
        form.setValue('vat_no', aresData.dic ?? '')
        form.setValue('country', aresData.sidlo.nazevStatu)
        toast.success('Údaje z ARESU byly úspěšně načteny')
      } else {
        console.error(parse.error)
        toast.error('Nepodařilo se načíst údaje z ARESU')
      }
    } catch (error) {
      console.error('ARES fetch error:', error)
      toast.error('Chyba při načítání údajů z ARESU')
    } finally {
      setIsLoadingAres(false)
    }
  }

  const handleSubmit = async (values: InvoicingDetailsFormSchema) => {
    // Convert the form values to match the expected API format
    const formattedValues = {
      registration_no: values.registration_no || undefined,
      name: values.name,
      vat_no: values.vat_no || undefined,
      street: values.street,
      street2: values.street2 || undefined,
      city: values.city,
      zip: values.zip,
      country: values.country,
      main_email: values.main_email || undefined,
      phone_number: values.phone_number || undefined,
      iban: values.iban || undefined,
      swift_bic: values.swift_bic || undefined,
      bank_account: values.bank_account || undefined,
      web_url: values.web_url || undefined,
      vat_payer: values.vat_payer || undefined
    }
    await upsert.mutateAsync(formattedValues)
    refetch()
    toast.success('Údaje byly úspěšně uloženy')
  }

  const isDirty = form.formState.isDirty

  const currentValues = form.getValues()

  return (
    <>
      <h2>Moje fakturační údaje</h2>
      <p className="text-xs">
        Zde zadejte údaje, které se budou zobrazovat na fakturách, které
        vytvoríte.
      </p>
      <div className="flex mt-5 flex-col">
        <ContactForm
          displayVatPayer
          form={form}
          onSubmit={handleSubmit}
          showInvoicingFields={true}
          showDialogFooter={false}
          isLoadingAres={isLoadingAres}
          onFetchAres={fetchAresData}
          customFooter={
            <div className="flex justify-between space-x-2">
              <FkButton
                type="button"
                variant="outline"
                onClick={() => {
                  const details = [
                    `Jméno: ${currentValues?.name || ''}`,
                    `IČO: ${currentValues?.registration_no || ''}`,
                    `DIČ: ${currentValues?.vat_no || ''}`,
                    `Ulice: ${currentValues?.street || ''}`,
                    `Část obce: ${currentValues?.street2 || ''}`,
                    `Město: ${currentValues?.city || ''}`,
                    `PSČ: ${currentValues?.zip || ''}`,
                    `Země: ${currentValues?.country || ''}`,
                    `IBAN: ${currentValues?.iban || ''}`,
                    `SWIFT/BIC: ${currentValues?.swift_bic || ''}`,
                    `Číslo účtu: ${currentValues?.bank_account || ''}`,
                    `Telefon: ${currentValues?.phone_number || ''}`,
                    `Web: ${currentValues?.web_url || ''}`
                  ]
                    .filter((line) => line.split(': ')[1]) // Keep only lines with values
                    .join('\n')
                  navigator.clipboard.writeText(details)
                  toast.success('Údaje zkopírovány do schránky')
                }}
              >
                Kopírovat všechny údaje do schránky
              </FkButton>
              <FkButton
                disabled={!isDirty}
                isLoading={upsert.isPending}
                type="submit"
              >
                Uložit
              </FkButton>
            </div>
          }
        />
      </div>
    </>
  )
}
