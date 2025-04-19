import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePicker } from '@/components/ui/date-picker'

import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { UploadIcon, PlusIcon, ReceiptIcon, Loader2 } from 'lucide-react'
import { SpinnerContainer } from '@/components/SpinnerContainer'
import { trpcClient } from '@/lib/trpcClient'

// Define validation schema for the form
const receivedInvoiceFormSchema = z.object({
  supplier_name: z.string().min(1, 'Jméno dodavatele je povinné'),
  supplier_registration_no: z.string().optional(),
  supplier_vat_no: z.string().optional(),
  supplier_street: z.string().optional(),
  supplier_city: z.string().optional(),
  supplier_zip: z.string().optional(),
  supplier_country: z.string().default('Česká republika'),
  invoice_number: z.string().min(1, 'Číslo faktury je povinné'),
  variable_symbol: z.string().optional(),
  expense_category: z.string().optional(),
  issue_date: z.date({
    required_error: 'Datum vystavení je povinné'
  }),
  taxable_supply_date: z.date().optional().nullable(),
  due_date: z.date({
    required_error: 'Datum splatnosti je povinné'
  }),
  receipt_date: z.date().optional().nullable(),
  total_without_vat: z.number().optional().nullable(),
  total_with_vat: z.number().min(0.01, 'Celková částka musí být větší než 0'),
  currency: z.string().max(3).min(3).default('CZK')
})

type ReceivedInvoiceFormValues = z.infer<typeof receivedInvoiceFormSchema>

export function ReceivedInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list')
  const [entryMethod, setEntryMethod] = useState<'manual' | 'upload'>('manual')
  const [isUploading, setIsUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  // tRPC hooks
  const utils = trpcClient.useUtils()
  const receivedInvoicesQuery = trpcClient.receivedInvoices.list.useQuery()
  const createMutation = trpcClient.receivedInvoices.create.useMutation({
    onSuccess: () => {
      utils.receivedInvoices.list.invalidate()
      toast.success('Faktura byla úspěšně přidána')
      form.reset()
      setActiveTab('list')
    },
    onError: (error) => {
      toast.error(`Chyba při ukládání faktury: ${error.message}`)
    }
  })
  const processImageMutation = trpcClient.receivedInvoices.orcImage.useMutation(
    {
      onSuccess: (data) => {
        setIsProcessingImage(false)
        if (data) {
          setOcrResult(data)

          // Format dates correctly
          // @ts-expect-error - TODO fix this
          const formData: Partial<ReceivedInvoiceFormValues> = {
            ...data,
            issue_date: data.issue_date ? new Date(data.issue_date) : undefined,
            due_date: data.due_date ? new Date(data.due_date) : undefined,
            taxable_supply_date: data.taxable_supply_date
              ? new Date(data.taxable_supply_date)
              : null,
            receipt_date: data.receipt_date ? new Date(data.receipt_date) : null
          }

          // Reset the form with the extracted data
          if (
            formData.supplier_name &&
            formData.invoice_number &&
            formData.issue_date &&
            formData.due_date &&
            formData.total_with_vat
          ) {
            form.reset(formData as ReceivedInvoiceFormValues)
            toast.success('Data byla úspěšně extrahována z faktury')
            setEntryMethod('manual') // Switch to manual mode to show the form with pre-filled data
          } else {
            toast.warning(
              'Z obrázku se nepodařilo rozpoznat všechna povinná data. Doplňte je prosím ručně.'
            )
            // Set whatever data was extracted
            form.reset(formData as any)
            setEntryMethod('manual')
          }
        }
      },
      onError: (error) => {
        setIsProcessingImage(false)
        toast.error(`Chyba při zpracování obrázku: ${error.message}`)
      }
    }
  )

  // Setup react-hook-form
  const form = useForm<ReceivedInvoiceFormValues>({
    // @ts-expect-error - TODO fix this
    resolver: zodResolver(receivedInvoiceFormSchema),
    defaultValues: {
      supplier_name: '',
      invoice_number: '',
      currency: 'CZK',
      supplier_country: 'Česká republika'
    }
  })

  const onSubmit = async (values: ReceivedInvoiceFormValues) => {
    const formattedValues = {
      ...values,
      issue_date: values.issue_date.toISOString().split('T')[0],
      due_date: values.due_date.toISOString().split('T')[0],
      taxable_supply_date: values.taxable_supply_date
        ? values.taxable_supply_date.toISOString().split('T')[0]
        : undefined,
      receipt_date: values.receipt_date
        ? values.receipt_date.toISOString().split('T')[0]
        : undefined
    }

    await createMutation.mutateAsync(formattedValues)
    toast.success('Faktura byla úspěšně přidána')
    form.reset()
  }

  // File upload handler
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)

      try {
        // Read the file as a base64 string
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64String = reader.result as string
          setIsProcessingImage(true)
          processImageMutation.mutate({ imageData: base64String })
        }
        reader.readAsDataURL(file)
      } catch (error) {
        toast.error(`Chyba při načítání souboru: ${(error as Error).message}`)
      } finally {
        setIsUploading(false)
      }
    }
  }

  // Loading state
  if (receivedInvoicesQuery.isLoading) {
    return <SpinnerContainer loading={true} />
  }

  const invoices = receivedInvoicesQuery.data || []

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Přijaté faktury</h1>
        <Button
          onClick={() => setActiveTab(activeTab === 'list' ? 'add' : 'list')}
        >
          {activeTab === 'list' ? (
            <>
              <PlusIcon className="mr-2 h-4 w-4" /> Přidat fakturu
            </>
          ) : (
            <>Zpět na seznam</>
          )}
        </Button>
      </div>

      {activeTab === 'add' ? (
        <Card>
          <CardHeader>
            <CardTitle>Nová přijatá faktura</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="manual"
              value={entryMethod}
              onValueChange={(value) =>
                setEntryMethod(value as 'manual' | 'upload')
              }
            >
              <TabsList className="mb-4">
                <TabsTrigger value="upload">Nahrát obrázek (OCR)</TabsTrigger>
                <TabsTrigger value="manual">Ruční zadání</TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div className="flex flex-col items-center p-8 border-2 border-dashed rounded-lg">
                  <ReceiptIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Nahrajte obrázek přijaté faktury
                  </p>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                    Nahrávání podporuje obrázky (JPG, PNG) faktur. Systém se
                    pokusí automaticky rozpoznat údaje z faktury pomocí OCR.
                  </p>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById('invoice-file-input')?.click()
                      }
                      disabled={isProcessingImage}
                    >
                      {isProcessingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zpracovávám...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="mr-2 h-4 w-4" />
                          Vybrat soubor
                        </>
                      )}
                    </Button>
                    <input
                      id="invoice-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isProcessingImage}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual">
                <Form {...form}>
                  <form
                    // @ts-expect-error - TODO fix this
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Supplier Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                          Informace o dodavateli
                        </h3>

                        <FormField
                          name="supplier_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Název dodavatele *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="supplier_registration_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IČ</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="supplier_vat_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>DIČ</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="supplier_street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ulice</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            name="supplier_city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Město</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            name="supplier_zip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PSČ</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          name="supplier_country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Země</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Invoice Details */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Detaily faktury</h3>

                        <FormField
                          name="invoice_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Číslo faktury *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="variable_symbol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variabilní symbol</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="expense_category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kategorie výdaje</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="issue_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Datum vystavení *</FormLabel>
                              <DatePicker
                                date={field.value}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="due_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Datum splatnosti *</FormLabel>
                              <DatePicker
                                date={field.value}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name="taxable_supply_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>
                                Datum uskutečnění zdanitelného plnění
                              </FormLabel>
                              <DatePicker
                                date={field.value}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            name="total_with_vat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Celkem s DPH *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            name="total_without_vat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Celkem bez DPH</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => {
                                      const value =
                                        e.target.value !== ''
                                          ? parseFloat(e.target.value)
                                          : null
                                      field.onChange(value)
                                    }}
                                    value={
                                      field.value === null ? '' : field.value
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Měna</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Ukládám...
                          </>
                        ) : (
                          'Uložit fakturu'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <div>
          {invoices.length > 0 ? (
            <div className="grid gap-4">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Dodavatel
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Číslo faktury
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Datum vystavení
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Datum splatnosti
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Částka
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-medium">
                          {invoice.supplier_name}
                        </td>
                        <td className="px-4 py-3">{invoice.invoice_number}</td>
                        <td className="px-4 py-3">{invoice.issue_date}</td>
                        <td className="px-4 py-3">{invoice.due_date}</td>
                        <td className="px-4 py-3 text-right">
                          {invoice.total_with_vat.toLocaleString()}{' '}
                          {invoice.currency}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'disputed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {invoice.status === 'received' && 'Přijato'}
                            {invoice.status === 'verified' && 'Ověřeno'}
                            {invoice.status === 'disputed' && 'Rozporováno'}
                            {invoice.status === 'paid' && 'Zaplaceno'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <ReceiptIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Žádné přijaté faktury
              </h3>
              <p className="text-muted-foreground mb-6">
                Zatím jste nepřidali žádné přijaté faktury.
              </p>
              <Button onClick={() => setActiveTab('add')}>
                <PlusIcon className="mr-2 h-4 w-4" /> Přidat fakturu
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
