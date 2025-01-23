import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'

// Create Document Component

import { CzechInvoicePDF } from './CzechInvoicePDF'
import { invoiceData } from '@/invoiceSchema'
import { Button } from '@/components/ui/button'
import { snakeCase } from 'lodash-es'
import { useLocation, useParams } from 'wouter'
import { trpcClient } from '@/lib/trpcClient'
import { EnglishInvoicePDF } from './EnglishInvoicePDF'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { useState, useEffect } from 'react'

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

export const InvoiceDetailPage = () => {
  const [invoice] = useInvoiceQueryByUrlParam()
  const params = useParams()
  const pdfName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}.pdf`
  const language = params.language ?? 'cs'
  const [location, navigate] = useLocation()

  const PdfContent = language === 'cs' ? CzechInvoicePDF : EnglishInvoicePDF

  return (
    <>
      <div className="h-full place-content-center flex flex-col">
        <div className="flex justify-between">
          <h3 className="text-3xl font-bold mb-4 text-center w-full">Náhled</h3>
          <Select
            value={language}
            onValueChange={(val) => {
              navigate(`/invoices/${params.invoiceId}/${val}`)
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

        <div className="h-full place-content-center flex">
          <PDFViewer
            key={`pdf-container-${language}-${invoice.id}`}
            showToolbar={false}
            style={{
              width: '70vw',
              height: '1100px'
            }}
          >
            <PdfContent key={language} invoiceData={invoice} />
          </PDFViewer>
        </div>

        <div className="flex content-center justify-center m-4">
          <PDFDownloadLink
            document={<PdfContent invoiceData={invoice} />}
            fileName={pdfName}
          >
            {({ loading }) =>
              loading ? (
                'Loading document...'
              ) : (
                <Button variant={'default'}>Stáhnout {pdfName}</Button>
              )
            }
          </PDFDownloadLink>
        </div>
      </div>
    </>
  )
}
