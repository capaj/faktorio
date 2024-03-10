import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'

// Create Document Component

import { CzechInvoicePDF } from './CzechInvoicePDF'
import { invoiceData } from '@/invoiceSchema'
import { Button } from '@/components/ui/button'
import { snakeCase } from 'lodash-es'

export const InvoiceDetail = () => {
  const pdfName = `${snakeCase(invoiceData.supplier.name)}-${
    invoiceData.invoiceNumber
  }.pdf`
  return (
    <>
      <div className="h-full place-content-center flex flex-col">
        <h3 className="text-3xl font-bold mb-4 text-center w-full">
          Invoice Preview
        </h3>
        <div className="h-full place-content-center flex">
          <PDFViewer
            key={new Date().getTime()}
            showToolbar={false}
            style={{
              width: '70vw',
              height: '1100px'
            }}
          >
            <CzechInvoicePDF invoiceData={invoiceData} />
          </PDFViewer>
        </div>
        <div className="flex content-center justify-center m-4">
          <PDFDownloadLink
            document={<CzechInvoicePDF invoiceData={invoiceData} />}
            fileName={pdfName}
          >
            {({ blob, url, loading, error }) =>
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
