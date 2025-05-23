import AutoForm from '@/components/ui/auto-form'

import {
  AresBusinessInformationSchema,
  fieldConfigForContactForm,
  formatStreetAddress
} from './ContactList/ContactList'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'
import { useEffect } from 'react'
import { useState } from 'react'
import { omit } from 'lodash-es'
import diff from 'microdiff'
import { toast } from 'sonner'
import { upsertInvoicingDetailsSchema } from 'faktorio-api/src/trpcRouter'

export const MyInvoicingDetails = () => {
  const [data, { refetch }] = trpcClient.invoicingDetails.useSuspenseQuery()

  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  const [values, setValues] = useState(data)
  const [isLoadingAres, setIsLoadingAres] = useState(false)

  const fetchAresData = async () => {
    if (!values?.registration_no || values.registration_no.length !== 8) return

    setIsLoadingAres(true)
    try {
      console.log('Fetching ARES data...', values.registration_no)
      const aresResponse = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${values.registration_no}`
      )
      const parse = AresBusinessInformationSchema.safeParse(
        await aresResponse.json()
      )
      console.log('parse', parse)
      if (parse.success) {
        const aresData = parse.data
        console.log('aresData', aresData)
        setValues({
          ...values,
          name: aresData.obchodniJmeno,
          street: formatStreetAddress(aresData),
          street2: aresData.sidlo.nazevCastiObce,
          city: aresData.sidlo.nazevObce,
          zip: String(aresData.sidlo.psc),
          vat_no: aresData.dic ?? null,
          country: aresData.sidlo.nazevStatu
        })
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

  const [isDirty, setIsDirty] = useState(false)
  useEffect(() => {
    if (!values) {
      return
    }
    const dataForDirtyCheck = omit(data, [
      'user_id',
      'created_at',
      'updated_at'
    ])
    const valDiff = diff(
      dataForDirtyCheck,
      omit(values, ['user_id', 'created_at', 'updated_at'])
    )

    if (valDiff.length > 0) {
      setIsDirty(true)
    } else {
      setIsDirty(false)
    }
  }, [data, values])

  return (
    <>
      <h2>Moje fakturační údaje</h2>
      <p className="text-xs">
        Zde zadejte údaje, které se budou zobrazovat na fakturách, které
        vytvoříte.
      </p>
      <div className="flex mt-5 flex-col">
        <AutoForm
          formSchema={upsertInvoicingDetailsSchema}
          containerClassName="grid grid-cols-2 gap-x-4"
          // @ts-expect-error
          fieldConfig={{
            ...fieldConfigForContactForm,
            registration_no: {
              label: 'IČO',
              inputProps: {
                placeholder: '8 čísel'
              },
              renderParent: ({ children }) => (
                <div className="flex items-end space-x-2">
                  <div className="flex-1">{children}</div>
                  <FkButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={fetchAresData}
                    disabled={!values?.registration_no || values.registration_no.length !== 8 || isLoadingAres}
                    isLoading={isLoadingAres}
                  >
                    Načíst z ARESU
                  </FkButton>
                </div>
              )
            },
            city: {
              label: 'Město'
            },
            iban: {
              label: 'IBAN'
            },
            swift_bic: {
              label: 'SWIFT/BIC'
            },
            bank_account: {
              label: 'Číslo bankovního účtu - včetně bankovního kódu'
            },
            phone_number: {
              label: 'Telefon'
            },
            web_url: {
              label: 'Web'
            }
          }}
          values={
            values
              ? {
                ...values,
                registration_no: values.registration_no ?? undefined
              }
              : undefined
          }
          onParsedValuesChange={(values) => {
            // @ts-expect-error
            setValues(values)
          }}
          onSubmit={async (values) => {
            await upsert.mutateAsync(values)
            refetch()
            toast.success('Údaje byly úspěšně uloženy')
            setIsDirty(false)
          }}
        >
          <div className="flex justify-between space-x-2">
            <FkButton
              type="button"
              variant="outline"
              onClick={() => {
                const details = [
                  `Jméno: ${values?.name || ''}`,
                  `IČO: ${values?.registration_no || ''}`,
                  `DIČ: ${values?.vat_no || ''}`,
                  `Ulice: ${values?.street || ''}`,
                  `Část obce: ${values?.street2 || ''}`,
                  `Město: ${values?.city || ''}`,
                  `PSČ: ${values?.zip || ''}`,
                  `Země: ${values?.country || ''}`,
                  `IBAN: ${values?.iban || ''}`,
                  `SWIFT/BIC: ${values?.swift_bic || ''}`,
                  `Číslo účtu: ${values?.bank_account || ''}`,
                  `Telefon: ${values?.phone_number || ''}`,
                  `Web: ${values?.web_url || ''}`
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
              disabled={!isDirty} // Enable button only if form is dirty
              isLoading={upsert.isPending}
              type="submit"
            >
              Uložit
            </FkButton>
          </div>
        </AutoForm>
      </div>
    </>
  )
}
