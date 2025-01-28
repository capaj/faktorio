import AutoForm from '@/components/ui/auto-form'
import { userInvoicingDetailsInsertSchema } from '../../../faktorio-api/src/zodDbSchemas'
import { fieldConfigForContactForm } from './ContactList/ContactList'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'

export const upsertInvoicingDetailsSchema =
  userInvoicingDetailsInsertSchema.omit({
    created_at: true,
    updated_at: true,
    user_id: true
  })

export const MyDetails = () => {
  const [data] = trpcClient.invoicingDetails.useSuspenseQuery()

  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  return (
    <>
      <h2>Moje údaje</h2>
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
          values={data ?? undefined}
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
