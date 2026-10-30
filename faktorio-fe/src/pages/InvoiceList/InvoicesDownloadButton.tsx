import { Button } from '@/components/ui/button'
import {
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenu
} from '@/components/ui/dropdown-menu'
import {
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  DownloadIcon,
  Loader2Icon
} from 'lucide-react'
import Papa from 'papaparse'
import { trpcClient, type RouterOutputs } from '@/lib/trpcClient'
import { getPrimaryBankAccount } from '@/lib/getPrimaryBankAccount'
import { snakeCase } from 'lodash-es'
import { useState, type ReactElement } from 'react'
import { resolveLogoForDisplay } from '@/lib/invoiceLogoStorage'
import { toast } from 'sonner'

type DownloadFormat = 'csv' | 'pdf' | 'zip'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to start reading the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function InvoicesDownloadButton({
  invoices,
  year,
  search,
  contactId,
  disabled = false
}: {
  invoices: RouterOutputs['invoices']['listInvoices']
  year?: number | null
  search?: string
  contactId?: string
  disabled?: boolean
}) {
  const [generating, setGenerating] = useState<DownloadFormat | null>(null)
  const utils = trpcClient.useUtils()

  const generateDownload = async (format: DownloadFormat) => {
    if (generating) return
    setGenerating(format)

    try {
      // Export the entire filtered result, including invoices beyond the table limit.
      const allInvoices = await utils.invoices.listInvoices.fetch({
        filter: search,
        year,
        ...(contactId ? { contactId } : {}),
        limit: null
      })
      if (allInvoices.length === 0) {
        toast.info('Žádné faktury ke stažení.')
        return
      }

      const firstInvoice = allInvoices[0]
      const lastInvoice = allInvoices[allInvoices.length - 1]
      const fileName = `invoices_${lastInvoice.number}_${firstInvoice.number}.${format}`

      if (format === 'csv') {
        downloadBlob(
          new Blob([Papa.unparse(allInvoices)], { type: 'text/csv' }),
          fileName
        )
        return
      }

      // Load PDF, QR code and archive libraries only when they are needed.
      const [
        { Document, pdf },
        { BlobWriter, ZipWriter },
        { CzechInvoicePDF, CzechInvoicePDFPage },
        { EnglishInvoicePDF, EnglishInvoicePDFPage },
        { default: QRCode },
        { generateQrPaymentString }
      ] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@zip.js/zip.js'),
        import('../InvoiceDetail/CzechInvoicePDF'),
        import('../InvoiceDetail/EnglishInvoicePDF'),
        import('qrcode'),
        import('@/lib/qrCodeGenerator')
      ])

      const invoicingDetails = await utils.invoicingDetails.fetch()
      const primaryBankAccount = getPrimaryBankAccount(invoicingDetails)
      const logoUrl = await resolveLogoForDisplay(invoicingDetails?.logo_url)
      const vatPayer = invoicingDetails?.vat_payer
      const zipWriter =
        format === 'zip'
          ? new ZipWriter(new BlobWriter('application/zip'))
          : undefined
      const pages: ReactElement[] = []

      for (const invoice of allInvoices) {
        const invoiceWithItems = await utils.invoices.getById.fetch({
          id: invoice.id
        })
        const invoiceTotal = invoiceWithItems.items.reduce(
          (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
          0
        )
        const taxTotal = invoiceWithItems.items.reduce((acc, item) => {
          const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
          return acc + total * ((vatPayer ? (item.vat_rate ?? 0) : 0) / 100)
        }, 0)
        const generatedQrString = generateQrPaymentString({
          accountNumber:
            invoiceWithItems.iban?.replace(/\s/g, '') ??
            invoiceWithItems.bank_account ??
            null,
          amount: invoiceTotal + taxTotal,
          currency: invoiceWithItems.currency,
          variableSymbol: invoiceWithItems.number.replace('-', ''),
          message: 'Faktura ' + invoiceWithItems.number
        })
        const qrPaymentString =
          primaryBankAccount.qrcode_decoded || generatedQrString
        const props = {
          invoiceData: invoiceWithItems,
          qrCodeBase64: qrPaymentString
            ? await QRCode.toDataURL(qrPaymentString)
            : undefined,
          vatPayer,
          logoUrl
        }

        if (zipWriter) {
          const PdfComponent =
            invoiceWithItems.language === 'en'
              ? EnglishInvoicePDF
              : CzechInvoicePDF
          const pdfBlob = await pdf(<PdfComponent {...props} />).toBlob()
          const baseName = `${snakeCase(invoiceWithItems.your_name ?? '')}-${invoiceWithItems.number}`
          await zipWriter.add(`${baseName}.pdf`, pdfBlob.stream())
        } else {
          const PdfPage =
            invoiceWithItems.language === 'en'
              ? EnglishInvoicePDFPage
              : CzechInvoicePDFPage
          pages.push(<PdfPage key={invoice.id} {...props} singlePage />)
        }
      }

      const blob = zipWriter
        ? await zipWriter.close()
        : await pdf(<Document>{pages}</Document>).toBlob()
      downloadBlob(blob, fileName)
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()}:`, error)
      toast.error(`Chyba při generování ${format.toUpperCase()} souboru`)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || invoices.length === 0 || generating !== null}
        >
          {generating ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="mr-2 h-4 w-4" />
          )}
          {generating ? 'Generuji...' : 'Stáhnout'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => generateDownload('csv')}>
          <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateDownload('pdf')}>
          <FileTextIcon className="mr-2 h-4 w-4" />
          PDF – všechny faktury
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateDownload('zip')}>
          <FileArchiveIcon className="mr-2 h-4 w-4" />
          ZIP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
