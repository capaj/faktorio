import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FkButton } from '@/components/FkButton'

import { Checkbox } from '@/components/ui/checkbox'
import { UseFormReturn } from 'react-hook-form'
import { ContactFormSchema } from './ContactList'

export const fieldLabels = {
  registration_no: 'IČO',
  name: 'Jméno',
  city: 'Město',
  street: 'Ulice',
  street2: 'Ulice 2',
  main_email: 'Email',
  vat_no: 'DIČ',
  zip: 'Poštovní směrovací číslo',
  phone_number: 'Telefon',
  country: 'Země'
} as const

// Component for rendering the contact form - moved outside to prevent recreation
export const ContactForm = ({
  form,
  onSubmit,
  isEdit = false,
  hasInvoices,
  invoiceCount,
  deleteInvoices,
  setDeleteInvoices,
  handleShowDeleteDialog,
  isLoadingAres,
  onFetchAres
}: {
  form: UseFormReturn<ContactFormSchema>
  onSubmit: (values: ContactFormSchema) => Promise<void>
  isEdit?: boolean
  hasInvoices?: boolean
  invoiceCount?: number
  deleteInvoices?: boolean
  setDeleteInvoices?: (value: boolean) => void
  handleShowDeleteDialog?: (e: React.MouseEvent) => void
  isLoadingAres?: boolean
  onFetchAres?: () => void
}) => {
  const registrationNo = form.watch('registration_no')

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4"
      >
        <FormField
          control={form.control}
          name="registration_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.registration_no}</FormLabel>
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="8 čísel"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                </div>
                {onFetchAres && (
                  <FkButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onFetchAres}
                    disabled={
                      !registrationNo ||
                      registrationNo.length !== 8 ||
                      isLoadingAres
                    }
                    isLoading={isLoadingAres}
                  >
                    Načíst z ARESU
                  </FkButton>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vat_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.vat_no}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="">
              <FormLabel>{fieldLabels.name}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.street}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="street2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.street2}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.city}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zip"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.zip}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.country}</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="main_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.main_email}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="off"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fieldLabels.phone_number}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEdit && (
          <DialogFooter className="col-span-2 flex justify-between">
            <div className="w-full flex justify-between">
              <div className="flex flex-col items-start gap-2">
                {hasInvoices && setDeleteInvoices && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="delete-invoices"
                      checked={deleteInvoices}
                      onCheckedChange={(checked) =>
                        setDeleteInvoices(checked === true)
                      }
                    />
                    <label
                      htmlFor="delete-invoices"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Smazat všechny faktury kontaktu ({invoiceCount})
                    </label>
                  </div>
                )}
                {handleShowDeleteDialog && (
                  <Button
                    className="align-left self-start justify-self-start"
                    variant={'destructive'}
                    onClick={handleShowDeleteDialog}
                    disabled={hasInvoices && !deleteInvoices}
                    type="button"
                  >
                    Smazat
                  </Button>
                )}
              </div>
              <Button type="submit">Uložit</Button>
            </div>
          </DialogFooter>
        )}

        {!isEdit && (
          <DialogFooter className="col-span-2">
            <Button type="submit">Přidat kontakt</Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  )
}
