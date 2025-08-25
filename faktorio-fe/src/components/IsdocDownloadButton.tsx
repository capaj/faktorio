import { Button, ButtonProps } from '@/components/ui/button'
import { trpcClient } from '@/lib/trpcClient'
import { generateIsdocXml } from '@/lib/isdoc/generateIsdocXml'
import { snakeCase } from 'lodash-es'
import { useState } from 'react'

interface IsdocDownloadButtonProps extends ButtonProps {
  invoiceId: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function IsdocDownloadButton({
  invoiceId,
  variant = 'outline',
  size = 'default',
  children,
  ...props
}: IsdocDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Pre-fetch invoice data for better UX
  const { data: invoice } = trpcClient.invoices.getById.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId }
  )
  
  // Pre-fetch invoicing details
  const { data: invoicingDetails } = trpcClient.invoicingDetails.useQuery()
  
  const handleDownload = () => {
    if (isDownloading || !invoice) return
    
    setIsDownloading(true)
    try {
      // Use a safe check for vat_payer property
      const isVatPayer = Boolean(invoicingDetails && 'vat_payer' in invoicingDetails ? invoicingDetails.vat_payer : false)
      const xml = generateIsdocXml(invoice, isVatPayer)
      
      // Create filename for download
      const baseFileName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}`
      const fileName = `${baseFileName}.isdoc`
      
      // Create a blob and trigger download
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading ISDOC:', error)
    } finally {
      setIsDownloading(false)
    }
  }
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleDownload}
      disabled={isDownloading || !invoice}
      {...props}
    >
      {isDownloading ? 'Stahování...' : children || 'Stáhnout ISDOC'}
    </Button>
  )
}
