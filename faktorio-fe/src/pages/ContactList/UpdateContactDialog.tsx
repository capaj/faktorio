import AutoForm from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

export const UpdateContactDialog = ({ contact }: {
  contact: 
}) => {
  return (
    <Dialog open={Boolean(open && params.contactId)} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový kontakt</DialogTitle>
          <DialogDescription>
            <AutoForm
              formSchema={schema}
              values={values}
              onParsedValuesChange={setValues}
              onSubmit={async (values) => {
                await create.mutateAsync(values)
                contactsQuery.refetch()
                setOpen(false)
              }}
              fieldConfig={fieldConfigForContactForm}
            >
              <DialogFooter>
                <Button type="submit">Uložit</Button>
              </DialogFooter>
            </AutoForm>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
