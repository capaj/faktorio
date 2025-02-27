import AutoForm from '@/components/ui/auto-form'
import { userInvoicingDetailsInsertSchema } from '../../../faktorio-api/src/zodDbSchemas'
import {
  AresBusinessInformationSchema,
  fieldConfigForContactForm
} from './ContactList/ContactList'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'
import { useEffect } from 'react'
import { useState } from 'react'

export const upsertInvoicingDetailsSchema =
  userInvoicingDetailsInsertSchema.omit({
    created_at: true,
    updated_at: true,
    user_id: true
  })

export const MyInvoicingDetails = () => {
  const query = trpcClient.invoicingDetails.useQuery()

  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  const [values, setValues] = useState(query.data)
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
            street: aresData.sidlo.nazevUlice,
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

  useEffect(() => {
    setValues(query.data)
  }, [query.data])

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
          }}
        >
          {/* <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Fakturuji většinou počet pracovních dní v měsíci</Label>
          </div> */}
          <div className="flex justify-end">
            <FkButton
              // disabled={true} // TODO
              isLoading={upsert.isLoading}
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
