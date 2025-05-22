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
import { invoiceItemFormSchema } from 'faktorio-api/src/zodDbSchemas'
import { LucideEdit } from 'lucide-react'

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
  invoice: z.infer<typeof invoiceForRenderSchema>
}) => {
  const params = useParams()
  const pdfName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}.pdf`
  const [searchParams] = useSearchParams()
  const language = searchParams.get('language') ?? 'cs'
  const [location, navigate] = useLocation()

  const PdfContent = language === 'cs' ? CzechInvoicePDF : EnglishInvoicePDF

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
            // key={JSON.stringify(invoice)}
            showToolbar={false}
            style={{
              width: '70vw',
              height: '1100px'
            }}
          >
            {/* @ts-expect-error */}
            <PdfContent invoiceData={invoice} />
          </PDFViewer>
        </div>

        <div className="flex content-center justify-center m-4">
          <PDFDownloadLink
            // @ts-expect-error
            document={<PdfContent invoiceData={invoice} />}
            fileName={pdfName}
          >
            <Button variant={'default'}>Stáhnout {pdfName}</Button>
          </PDFDownloadLink>
        </div>
      </div>
    </>
  )
}
