import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useParams } from 'wouter'
import { trpcClient } from '@/lib/trpcClient'
import { generateIsdocXml } from '@/lib/isdoc/generateIsdocXml'
import { snakeCase } from 'lodash-es'

/**
 * Page component for exporting invoice data as ISDOC XML format
 * ISDOC is a Czech standard for electronic invoicing
 */
export const IsdocExportPage = () => {
  const { invoiceId } = useParams()
  const [xmlContent, setXmlContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  // Fetch invoice data
  const invoiceQuery = trpcClient.invoices.getById.useSuspenseQuery({
    id: invoiceId || ''
  })
  const [invoice] = invoiceQuery
  
  // Fetch invoicing details to determine if user is VAT payer
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()
  
  useEffect(() => {
    if (invoice) {
      // Generate ISDOC XML
      // Use a safe check for vat_payer property
      const isVatPayer = Boolean(invoicingDetails && 'vat_payer' in invoicingDetails ? invoicingDetails.vat_payer : false)
      const xml = generateIsdocXml(invoice, isVatPayer)
      setXmlContent(xml)
      
      // Create filename for download
      const baseFileName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}`
      setFileName(`${baseFileName}.isdoc`)
    }
  }, [invoice, invoicingDetails])

  // Function to download XML content
  const downloadXml = () => {
    if (!xmlContent) return
    
    const blob = new Blob([xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Function to display XML content
  const displayXml = () => {
    if (!xmlContent) return null
    
    return (
      <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
        {xmlContent}
      </pre>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ISDOC Export</h1>
      
      {invoice ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl mb-2">Invoice: {invoice.number}</h2>
            <p className="text-gray-600">
              Client: {invoice.client_name}<br />
              Issued on: {invoice.issued_on}<br />
              Due on: {invoice.due_on}
            </p>
          </div>
          
          <div className="mb-6">
            <Button onClick={downloadXml} className="mr-4">
              Download ISDOC XML
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Invoice
            </Button>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">XML Preview</h3>
            {displayXml()}
          </div>
        </>
      ) : (
        <p>Loading invoice data...</p>
      )}
    </div>
  )
}

export default IsdocExportPage
