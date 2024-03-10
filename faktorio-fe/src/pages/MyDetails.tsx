import AutoForm from '@/components/ui/auto-form'
import { userInvoicingDetailsInsertSchema } from '../../../faktorio-api/src/zodDbSchemas'
import { fieldConfigForContactForm } from './ContactList'
import { Button } from '@/components/ui/button'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'

export const upsertInvoicingDetailsSchema =
  userInvoicingDetailsInsertSchema.omit({
    created_at: true,
    updated_at: true,
    id: true,
    user_id: true
  })

export const MyDetails = () => {
  const q = trpcClient.invoicingDetails.useQuery()
  const upsert = trpcClient.upsertInvoicingDetails.useMutation()
  return (
    <>
      <h2>Moje údaje</h2>
      <div className="flex mt-5">
        <AutoForm
          formSchema={upsertInvoicingDetailsSchema}
          fieldConfig={{
            ...fieldConfigForContactForm,
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
            }
          }}
          values={q.data ?? undefined}
          onSubmit={async (values) => {
            await upsert.mutateAsync(values)
          }}
        >
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
