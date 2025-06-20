import { useState, DragEvent } from 'react'
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
import { DatePicker } from '@/components/ui/date-picker'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { toast } from 'sonner'
import { z } from 'zod/v4'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'

import {
  UploadIcon,
  PlusIcon,
  ReceiptIcon,
  Loader2,
  Trash2Icon,
  DownloadIcon
} from 'lucide-react'
import { SpinnerContainer } from '@/components/SpinnerContainer'
import { trpcClient } from '@/lib/trpcClient'
import { cn } from '@/lib/utils'
import Papa from 'papaparse'

// Define validation schema for the form
const receivedInvoiceFormSchema = z.object({
  supplier_name: z.string().min(1, 'Jméno dodavatele je povinné'),
  supplier_registration_no: z.string().nullish(),
  supplier_vat_no: z.string().nullish(),
  supplier_street: z.string().nullish(),
  supplier_city: z.string().nullish(),
  supplier_zip: z.string().nullish(),
  supplier_country: z.string().default('Česká republika').nullable(),
  invoice_number: z.string().min(1, 'Číslo faktury je povinné'),
  variable_symbol: z.string().nullish(),
  expense_category: z.string().nullish(),
  issue_date: z.date({
    error: 'Datum vystavení je povinné'
  }),
  taxable_supply_date: z.date().optional().nullable(),
  due_date: z.date({
    error: 'Datum splatnosti je povinné'
  }),
  receipt_date: z.date().optional().nullable(),
  total_without_vat: z.number().optional().nullable(),
  total_with_vat: z.number().min(0.01, 'Celková částka musí být větší než 0'),
  currency: z.string().max(3).min(3).default('CZK'),
  line_items_summary: z.string().nullish()
})

type ReceivedInvoiceFormValues = z.infer<typeof receivedInvoiceFormSchema>

export function ReceivedInvoicesPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // tRPC hooks
  const utils = trpcClient.useUtils()
  const receivedInvoicesQuery = trpcClient.receivedInvoices.list.useQuery({
    from: selectedYear ? `${selectedYear}-01-01` : undefined,
    to: selectedYear ? `${selectedYear + 1}-01-01` : undefined
  })
  const createMutation = trpcClient.receivedInvoices.create.useMutation({
    onSuccess: () => {
      utils.receivedInvoices.list.invalidate()
      toast.success('Faktura byla úspěšně přidána')
      form.reset()
      setShowAddForm(false)
    },
    onError: (error) => {
      toast.error(`Chyba při ukládání faktury: ${error.message}`)
    }
  })
  const processImageMutation =
    trpcClient.receivedInvoices.extractInvoiceData.useMutation({
      onSuccess: (data, variables) => {
        setIsProcessingImage(false)
        if (variables.mimeType?.startsWith('image/')) {
          const fullDataUrl = `data:${variables.mimeType};base64,${variables.imageData}`
          setProcessedFileUrl(fullDataUrl)
        } else {
          setProcessedFileUrl(null)
        }

        if (data) {
          setOcrResult(data)

          // Calculate total_without_vat from vat_base_xx fields
          const calculatedTotalWithoutVat = [
            data.vat_base_21,
            data.vat_base_15,
            data.vat_base_10,
            data.vat_base_0
          ]
            .filter((v): v is number => typeof v === 'number') // Ensure they are numbers
            .reduce((sum, current) => sum + current, 0)

          // Format dates correctly and include calculated total

          const formData = {
            supplier_country: 'Česká republika',
            ...data,
            issue_date: data.issue_date ? new Date(data.issue_date) : undefined,
            due_date: data.due_date ? new Date(data.due_date) : undefined,
            taxable_supply_date: data.taxable_supply_date
              ? new Date(data.taxable_supply_date)
              : null,
            receipt_date: data.receipt_date
              ? new Date(data.receipt_date)
              : null,
            // Use calculated value if > 0, otherwise keep potential OCR value or null
            total_without_vat:
              calculatedTotalWithoutVat > 0
                ? calculatedTotalWithoutVat
                : (data.total_without_vat ?? null)
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
            // Ensure the form is visible if data is extracted
            if (!showAddForm) setShowAddForm(true)
          } else {
            toast.warning(
              'Z obrázku se nepodařilo rozpoznat všechna povinná data. Doplňte je prosím ručně.'
            )
            // Set whatever data was extracted and show the form
            form.reset(formData)
            if (!showAddForm) setShowAddForm(true)
          }
        }
      },
      onError: (error) => {
        setIsProcessingImage(false)
        toast.error(`Chyba při zpracování obrázku: ${error.message}`)
      }
    })

  const deleteMutation = trpcClient.receivedInvoices.delete.useMutation({
    onSuccess: () => {
      utils.receivedInvoices.list.invalidate()
      toast.success('Faktura byla úspěšně smazána')
    }
  })

  // Setup react-hook-form
  const form = useForm<ReceivedInvoiceFormValues>({
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

  const handleDeleteInvoice = async (id: string) => {
    if (
      window.confirm(
        'Opravdu chcete smazat tuto fakturu? Tato akce je nevratná.'
      )
    ) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error) {
        // Error is handled by the onError callback in useMutation
      }
    }
  }

  // File processing logic (extracted for reuse)
  const processFile = (file: File) => {
    if (file) {
      setIsUploading(true)
      setProcessedFileUrl(null) // Clear previous preview

      const handleProcessedFile = (processedFile: File) => {
        // Check file size (max 7MB)
        const maxSize = 7 * 1024 * 1024 // 7MB in bytes
        if (processedFile.size > maxSize) {
          toast.error(
            'Soubor je příliš velký. Maximální povolená velikost je 7 MB.'
          )
          return
        }

        try {
          // Read the file as a base64 string
          const reader = new FileReader()
          reader.onloadend = async () => {
            const fullDataUrl = reader.result as string
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
            const base64String = fullDataUrl.split(',')[1]

            if (!base64String) {
              toast.error('Chyba při čtení souboru.')
              setIsProcessingImage(false)
              setIsUploading(false)
              return
            }

            setIsProcessingImage(true)
            // Update preview immediately for images, handle PDF differently if needed for preview
            if (processedFile.type.startsWith('image/')) {
              setProcessedFileUrl(fullDataUrl) // Keep full URL for preview
            } else {
              // For PDF, we might not show a preview, or show a generic icon
              setProcessedFileUrl(null) // Explicitly set to null for non-images
            }
            processImageMutation.mutate({
              mimeType: processedFile.type,
              imageData: base64String
            })
          }
          reader.readAsDataURL(processedFile)
        } catch (error) {
          toast.error(`Chyba při načítání souboru: ${(error as Error).message}`)
          setIsProcessingImage(false) // Ensure state is reset on error
          setIsUploading(false)
        }
        // Removed finally block from here to avoid setting setIsUploading(false) too early for BMP conversion
      }

      if (file.type === 'image/bmp') {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const pngFile = new File(
                      [blob],
                      file.name.replace(/\.bmp$/, '.png'),
                      {
                        type: 'image/png'
                      }
                    )
                    handleProcessedFile(pngFile)
                  } else {
                    toast.error('Chyba při konverzi BMP do PNG.')
                    setIsUploading(false)
                  }
                },
                'image/png',
                1 // quality
              )
            } else {
              toast.error(
                'Chyba při vytváření canvas contextu pro konverzi BMP.'
              )
              setIsUploading(false)
            }
          }
          img.onerror = () => {
            toast.error('Chyba při načítání BMP obrázku pro konverzi.')
            setIsUploading(false)
          }
          if (e.target?.result) {
            img.src = e.target.result as string
          }
        }
        reader.onerror = () => {
          toast.error('Chyba při čtení BMP souboru.')
          setIsUploading(false)
        }
        reader.readAsDataURL(file)
      } else {
        handleProcessedFile(file)
      }
    }
  }

  // File input change handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset input value to allow uploading the same file again
    event.target.value = ''
  }

  // Drag and Drop Handlers
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault() // Necessary to allow dropping
    setIsDraggingOver(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      processFile(file)
    }
  }

  // Loading state
  if (receivedInvoicesQuery.isLoading) {
    return <SpinnerContainer loading={true} />
  }

  const invoices = receivedInvoicesQuery.data || []

  // Calculate totals
  const totalWithoutVatSum = invoices.reduce(
    (sum, invoice) => sum + (invoice.total_without_vat ?? 0),
    0
  )
  const totalWithVatSum = invoices.reduce(
    (sum, invoice) => sum + invoice.total_with_vat,
    0
  )
  // Assuming all invoices have the same currency for the sum display
  const currency = invoices[0]?.currency || 'CZK'

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold">Přijaté faktury</h3>
          {!showAddForm && (
            <Select
              value={selectedYear === null ? 'null' : selectedYear.toString()}
              onValueChange={(value) => {
                if (value === 'null') {
                  setSelectedYear(null)
                } else {
                  setSelectedYear(parseInt(value))
                }
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rok" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(6)].map((_, i) => {
                  const year = currentYear - i
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )
                })}
                <SelectItem value="null">Všechny</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? (
              <>Zpět na seznam</>
            ) : (
              <>
                <PlusIcon className="mr-2 h-4 w-4" /> Přidat fakturu
              </>
            )}
          </Button>
        </div>
      </div>

      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Nová přijatá faktura</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Upload Section - Added Drag and Drop Handlers */}
            <div
              className={cn(
                'mb-8 flex flex-col items-center p-8 border-2 border-dashed rounded-lg transition-colors',
                isDraggingOver ? 'border-primary bg-primary/10' : '',
                isProcessingImage
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                !isProcessingImage &&
                document.getElementById('invoice-file-input')?.click()
              }
            >
              {isProcessingImage ? (
                <div className="flex flex-col items-center text-center">
                  <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
                  <p className="text-lg font-medium mb-2">
                    Zpracovávám fakturu...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Prosím počkejte, systém analyzuje data.
                  </p>
                </div>
              ) : processedFileUrl ? (
                <div className="flex flex-col items-center">
                  <img
                    src={processedFileUrl}
                    alt="Invoice Preview"
                    className="h-128 w-auto object-contain mb-4 rounded"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent triggering the div's onClick
                      document.getElementById('invoice-file-input')?.click()
                    }}
                    disabled={isProcessingImage}
                    className="mt-4" // Added margin
                  >
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Nahradit obrázek
                  </Button>
                </div>
              ) : (
                <>
                  <ReceiptIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Přetáhněte sem soubor nebo klikněte pro výběr
                  </p>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                    Podporované formáty: JPG, PNG, BMP, PDF. Systém se pokusí
                    automaticky rozpoznat údaje z faktury pomocí OCR.
                  </p>
                </>
              )}
              <input
                id="invoice-file-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf,image/bmp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isProcessingImage}
              />
            </div>

            {/* Manual Form Section */}
            <Form {...form}>
              <form
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

                    <FormField
                      name="line_items_summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI souhrn položek</FormLabel>
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
                        <FormItem className="flex flex-col gap-0">
                          <FormLabel className="mt-0.5">
                            Datum vystavení *
                          </FormLabel>
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
                        <FormItem className="flex flex-col gap-0">
                          <FormLabel className="mt-0.5">
                            Datum splatnosti *
                          </FormLabel>
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
                          <FormLabel className="mt-0.5">
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
                                value={field.value === null ? '' : field.value}
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
          </CardContent>
        </Card>
      ) : (
        <div>
          {invoices.length > 0 ? (
            <div className="grid gap-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AI souhrn položek</TableHead>
                      <TableHead>Dodavatel</TableHead>
                      <TableHead>Číslo faktury</TableHead>
                      <TableHead>Datum vystavení</TableHead>
                      <TableHead>Datum splatnosti</TableHead>
                      <TableHead className="text-right">
                        Celkem bez DPH
                      </TableHead>
                      <TableHead className="text-right">Celkem s DPH</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.line_items_summary}</TableCell>

                        <TableCell className="font-medium">
                          {invoice.supplier_name}
                        </TableCell>
                        <TableCell>{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.issue_date}</TableCell>
                        <TableCell>{invoice.due_date}</TableCell>
                        <TableCell className="text-right">
                          {invoice.total_without_vat !== null &&
                          invoice.total_without_vat !== undefined
                            ? `${invoice.total_without_vat.toLocaleString()} ${invoice.currency}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.total_with_vat.toLocaleString()}{' '}
                          {invoice.currency}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                            aria-label="Smazat fakturu"
                          >
                            {deleteMutation.isPending &&
                            deleteMutation.variables?.id === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2Icon className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-medium">
                        Celkem
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totalWithoutVatSum.toLocaleString()} {currency}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {totalWithVatSum.toLocaleString()} {currency}
                      </TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell className="text-right">
                        {invoices.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const csv = Papa.unparse(invoices)
                              const blob = new Blob([csv], {
                                type: 'text/csv'
                              })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              const yearSuffix =
                                selectedYear === null
                                  ? '_all'
                                  : `_${selectedYear}`
                              a.download = `received_invoices${yearSuffix}.csv`
                              document.body.appendChild(a) // Append link to body
                              a.click()
                              document.body.removeChild(a) // Clean up
                              URL.revokeObjectURL(url) // Free up memory
                            }}
                          >
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Stáhnout CSV
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <ReceiptIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Žádné přijaté faktury
              </h3>
              <p className="text-muted-foreground mb-6">
                Zatím jste nepřidali žádné přijaté faktury pro rok{' '}
                {selectedYear}
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <PlusIcon className="mr-2 h-4 w-4" /> Přidat fakturu
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
