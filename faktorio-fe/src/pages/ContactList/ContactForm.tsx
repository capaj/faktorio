import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FkButton } from '@/components/FkButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { UseFormReturn } from 'react-hook-form'
import { ContactFormSchema } from './ContactList'
import { Checkbox } from '@/components/ui/checkbox'

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
  country: 'Země',
  language: 'Jazyk faktur',
  iban: 'IBAN',
  swift_bic: 'SWIFT/BIC',
  bank_account: 'Číslo bankovního účtu - včetně bankovního kódu',
  web_url: 'Web'
} as const

// Extended type for invoicing details
export type InvoicingDetailsFormSchema = ContactFormSchema & {
  iban?: string | null
  swift_bic?: string | null
  bank_account?: string | null
  web_url?: string | null
}

// Component for rendering the contact form - moved outside to prevent recreation
type ContactFormValues = ContactFormSchema & Partial<InvoicingDetailsFormSchema>

export const ContactForm = ({
  displayVatPayer,
  form,
  onSubmit,
  isEdit = false,
  handleShowDeleteDialog,
  isLoadingAres,
  onFetchAres,
  showInvoicingFields = false,
  showDialogFooter = true,
  customFooter
}: {
  displayVatPayer?: boolean
  form: UseFormReturn<ContactFormValues>
  onSubmit: (values: ContactFormValues) => Promise<void>
  isEdit?: boolean
  invoiceCount?: number
  handleShowDeleteDialog?: (e: React.MouseEvent) => void
  isLoadingAres?: boolean
  onFetchAres?: () => void
  showInvoicingFields?: boolean
  showDialogFooter?: boolean
  customFooter?: React.ReactNode
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

        {displayVatPayer && (
          <FormField
            control={form.control}
            name="vat_payer"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start space-x-2">
                <FormLabel>Plátce DPH</FormLabel>
                <div className="flex items-center space-x-2 mt-4">
                  <FormControl>
                    <Checkbox
                      {...field}
                      value={Number(field.value)}
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Označte, pokud je tato firma plátce VAT.
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="vat_no"
          disabled={!form.watch('vat_payer')}
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
            <FormItem>
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

        <div className="flex flex-row gap-2">
          <FormField
            control={form.control}
            name="country"
            defaultValue="Česká Republika"
            render={({ field }) => (
              <FormItem className="flex-1">
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
            name="language"
            render={({ field }) => (
              <FormItem className="flex-1/2 max-w-1/3">
                <FormLabel>{fieldLabels.language}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || 'cs'}
                  value={field.value || 'cs'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte jazyk" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cs">Česky</SelectItem>
                    <SelectItem value="en">Anglicky</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional fields for invoicing details */}
        {showInvoicingFields && (
          <>
            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.iban}</FormLabel>
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

            <FormField
              control={form.control}
              name="swift_bic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.swift_bic}</FormLabel>
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

            <FormField
              control={form.control}
              name="bank_account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.bank_account}</FormLabel>
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

            <FormField
              control={form.control}
              name="web_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.web_url}</FormLabel>
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
          </>
        )}

        {/* Custom footer (for MyInvoicingDetails) */}
        {customFooter && <div className="col-span-2">{customFooter}</div>}

        {/* Dialog footer (for ContactList) */}
        {showDialogFooter && isEdit && (
          <DialogFooter className="col-span-2 flex justify-between">
            <div className="w-full flex justify-between">
              <div className="flex flex-col items-start gap-2">
                {handleShowDeleteDialog && (
                  <Button
                    className="align-left self-start justify-self-start"
                    variant={'destructive'}
                    onClick={handleShowDeleteDialog}
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

        {showDialogFooter && !isEdit && (
          <DialogFooter className="col-span-2">
            <Button type="submit">Přidat kontakt</Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  )
}
