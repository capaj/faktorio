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
  DownloadIcon
} from 'lucide-react'
import { useFilteredInvoicesQuery } from './InvoiceListPage'
import Papa from 'papaparse'
import { pdf } from '@react-pdf/renderer'
import { BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { CzechInvoicePDF } from '../InvoiceDetail/CzechInvoicePDF'
import { EnglishInvoicePDF } from '../InvoiceDetail/EnglishInvoicePDF'
import { trpcClient } from '@/lib/trpcClient'
import QRCode from 'qrcode'
import { generateQrPaymentString } from '@/lib/qrCodeGenerator'
import { snakeCase } from 'lodash-es'
import { useState } from 'react'

export function InvoicesDownloadButton({
  year,
  search
}: {
  year?: number | null
  search?: string
}) {
  const q = useFilteredInvoicesQuery(search, year)
  const invoices = q.data ?? []
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const utils = trpcClient.useUtils()

  const generateZipDownload = async () => {
    try {
      setIsGeneratingZip(true)

      const zipWriter = new ZipWriter(new BlobWriter('application/zip'))

      for (const invoice of invoices) {
        // Fetch complete invoice data with items
        const invoiceWithItems = await utils.invoices.getById.fetch({
          id: invoice.id
        })

        const invoiceTotal = invoiceWithItems.items.reduce(
          (acc: number, item) =>
            acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
          0
        )

        const taxTotal = invoiceWithItems.items.reduce((acc: number, item) => {
          const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
          const vat = item.vat_rate ?? 0
          return acc + total * (vat / 100)
        }, 0)

        const qrPaymentString = generateQrPaymentString({
          accountNumber:
            invoiceWithItems.iban?.replace(/\s/g, '') ??
            invoiceWithItems.bank_account ??
            null,
          amount: invoiceTotal + taxTotal,
          currency: invoiceWithItems.currency,
          variableSymbol: invoiceWithItems.number.replace('-', ''),
          message: 'Faktura ' + invoiceWithItems.number
        })
        const qrCodeBase64 = qrPaymentString
          ? await QRCode.toDataURL(qrPaymentString)
          : undefined

        const PdfComponent =
          invoiceWithItems.language === 'en'
            ? EnglishInvoicePDF
            : CzechInvoicePDF

        const invoicingDetails = await utils.invoicingDetails.fetch()

        const PdfDoc = (
          <PdfComponent
            invoiceData={invoiceWithItems}
            qrCodeBase64={qrCodeBase64}
            vatPayer={invoicingDetails?.vat_payer}
          />
        )

        const pdfBlob = await pdf(PdfDoc).toBlob()

        const baseName = `${snakeCase(invoiceWithItems.your_name ?? '')}-${invoiceWithItems.number}`

        await zipWriter.add(`${baseName}.pdf`, pdfBlob.stream())
      }

      const zipBlob = await zipWriter.close()

      const firstInvoice = invoices[0]
      const lastInvoice = invoices[invoices.length - 1]

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoices_${lastInvoice.number}_${firstInvoice.number}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating ZIP:', error)
      alert('Chyba při generování ZIP souboru')
    } finally {
      setIsGeneratingZip(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Stáhnout
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async () => {
              const csv = Papa.unparse(invoices)

              const firstInvoice = invoices[0]
              const lastInvoice = invoices[invoices.length - 1]
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `invoices_${lastInvoice.number}_${firstInvoice.number}.csv`
              a.click()
              document.body.removeChild(a)
            }}
          >
            <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={generateZipDownload}
            disabled={isGeneratingZip || invoices.length === 0}
          >
            <FileArchiveIcon className="mr-2 h-4 w-4" />
            {isGeneratingZip ? 'Generuji...' : 'ZIP'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
