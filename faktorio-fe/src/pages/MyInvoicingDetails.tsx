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
  const [data] = trpcClient.invoicingDetails.useSuspenseQuery()

  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  const [values, setValues] = useState(data)
  useEffect(() => {
    ;(async () => {
      if (values?.registration_no?.length === 8 && !values?.name) {
        // seems like a user is trying to add new contact, let's fetch data from ares
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
        } else {
          console.error(parse.error)
        }
      }
    })()
  }, [values?.registration_no])
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
    const valDiff = diff(dataForDirtyCheck, values)

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
              label:
                'IČO - po vyplnění se automaticky doplní další údaje z ARESU',
              inputProps: {
                placeholder: '8 čísel'
              }
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
              label: 'Číslo bankovního účtu'
            },
            phone_number: {
              label: 'Telefon'
            },
            web_url: {
              label: 'Web'
            }
          }}
          values={values ?? {}}
          onParsedValuesChange={(values) => {
            // @ts-expect-error
            setValues(values)
          }}
          onSubmit={async (values) => {
            await upsert.mutateAsync(values)
            toast.success('Údaje byly úspěšně uloženy')
            setIsDirty(false)
          }}
        >
          {/* <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Fakturuji většinou počet pracovních dní v měsíci</Label>
          </div> */}
          <div className="flex justify-end">
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
