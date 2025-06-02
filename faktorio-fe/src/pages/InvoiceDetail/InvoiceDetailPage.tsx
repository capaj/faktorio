import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'

import { CzechInvoicePDF } from './CzechInvoicePDF'
import { Button } from '@/components/ui/button'
import { snakeCase } from 'lodash-es'
import { useLocation, useParams, useSearchParams } from 'wouter'
import { trpcClient } from '@/lib/trpcClient'
import { EnglishInvoicePDF } from './EnglishInvoicePDF'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { djs } from 'faktorio-shared/src/djs'
import { getInvoiceCreateSchema } from 'faktorio-api/src/routers/zodSchemas'
import { z } from 'zod/v4'
import {
  invoiceItemFormSchema,
  SelectInvoiceType,
  InsertInvoiceItemType
} from 'faktorio-api/src/zodDbSchemas'
import { LucideEdit } from 'lucide-react'
import { useQRCodeBase64 } from '@/lib/useQRCodeBase64'
import { generateQrPaymentString } from '@/lib/qrCodeGenerator'

export function useInvoiceQueryByUrlParam() {
  const { invoiceId } = useParams()
  if (!invoiceId) {
    throw new Error('No invoiceId')
  }

  const invoiceQuery = trpcClient.invoices.getById.useSuspenseQuery({
    id: invoiceId
  })
  return invoiceQuery
}
// TODO here we currently only show the invoice PDF, but we should also show the invoice details
export const InvoiceDetailPage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()

  return <InvoiceDetail invoice={invoice} />
}

export const invoiceForRenderSchema = getInvoiceCreateSchema(
  djs().format('YYYYMMDD') + '001'
).extend({
  your_name: z.string().optional(),
  items: z.array(invoiceItemFormSchema),
  bank_account: z.string().nullish(),
  iban: z.string().nullish(),
  swift_bic: z.string().nullish()
})

export const InvoiceDetail = ({
  invoice
}: {
  invoice: SelectInvoiceType & { items: InsertInvoiceItemType[] }
}) => {
  const params = useParams()
  const pdfName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}.pdf`
  const [searchParams] = useSearchParams()
  const language = searchParams.get('language') ?? 'cs'
  const [location, navigate] = useLocation()

  const invoiceTotal = invoice.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  const taxTotal = invoice.items.reduce((acc, item) => {
    const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
    const vat = item.vat_rate ?? 0
    return acc + total * (vat / 100)
  }, 0)

  const qrCodeBase64 = useQRCodeBase64(
    generateQrPaymentString({
      accountNumber: invoice.iban?.replace(/\s/g, '') ?? '',
      amount: invoiceTotal + taxTotal,
      currency: invoice.currency,
      variableSymbol: invoice.number.replace('-', ''),
      message: 'Faktura ' + invoice.number
    })
  )

  const PdfContent = language === 'cs' ? CzechInvoicePDF : EnglishInvoicePDF

  if (!qrCodeBase64) {
    return (
      <div className="h-full place-content-center flex flex-col">
        <div className="flex justify-center items-center h-full">
          <div className="text-lg text-gray-600">Načítání faktury...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-full place-content-center flex flex-col">
        <div className="flex justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold  text-center w-full">Náhled</h3>
            <Select
              value={language}
              onValueChange={(val) => {
                navigate(`/invoices/${params.invoiceId}?language=${val}`)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Jazyk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cs">Česky</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={'outline'}
            onClick={() => {
              navigate(`/invoices/${params.invoiceId}/edit`)
            }}
          >
            <LucideEdit />
            Upravit
          </Button>
        </div>

        <div className="h-full place-content-center flex">
          <PDFViewer
            key={`${invoice.id}-${language}-${!!qrCodeBase64}`}
            showToolbar={false}
            style={{
              width: '70vw',
              height: '1100px'
            }}
          >
            <PdfContent invoiceData={invoice} qrCodeBase64={qrCodeBase64} />
          </PDFViewer>
        </div>

        <div className="flex content-center justify-center m-4">
          <PDFDownloadLink
            document={
              <PdfContent invoiceData={invoice} qrCodeBase64={qrCodeBase64} />
            }
            fileName={pdfName}
          >
            <Button variant={'default'}>Stáhnout {pdfName}</Button>
          </PDFDownloadLink>
        </div>
      </div>
    </>
  )
}
