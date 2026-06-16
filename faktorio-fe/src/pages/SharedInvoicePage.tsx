import { useEffect, useState } from 'react'
import { useParams } from 'wouter'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { CzechInvoicePDF } from './InvoiceDetail/CzechInvoicePDF'
import { EnglishInvoicePDF } from './InvoiceDetail/EnglishInvoicePDF'
import { Download } from 'lucide-react'
import { snakeCase } from 'lodash-es'
import { Button } from '@/components/ui/button'
import { generateIsdocXml } from '@/lib/isdoc/generateIsdocXml'
import { trpcClient } from '@/lib/trpcClient'

const PUBLIC_API_BASE = (import.meta as any).env.VITE_PUBLIC_API_URL as
  | string
  | undefined

export function SharedInvoicePage() {
  const { shareId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)
  const [language, setLanguage] = useState<'cs' | 'en'>('cs')
  const sharedInvoiceEvent = trpcClient.sharedInvoiceEvent.useMutation()

  useEffect(() => {
    if (!shareId) return
    const base =
      PUBLIC_API_BASE ?? 'https://faktorio-public-api.capaj.workers.dev'
    const url = `${base}/shared-invoice/${shareId}`

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((json) => setData(json))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [shareId])

  useEffect(() => {
    // log view is handled server-side on GET
  }, [])

  const PdfComponent = language === 'cs' ? CzechInvoicePDF : EnglishInvoicePDF

  if (loading) return <div className="p-8 text-center">Načítání…</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (!data) return null

  const invoice = data.invoice
  const items = data.items

  const baseFileName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}`
  const pdfName = `${baseFileName}.pdf`
  const isdocName = `${baseFileName}.isdoc`

  const docProps = {
    invoiceData: { ...invoice, items },
    qrCodeBase64: '',
    vatPayer: data.vatPayer ?? false,
    logoUrl: data.logoUrl ?? null
  }

  const onDownload = () => {
    if (!shareId) return
    sharedInvoiceEvent.mutate({ shareId, type: 'download' })
  }

  const handleIsdocDownload = () => {
    try {
      const xml = generateIsdocXml(
        { ...invoice, items },
        data.vatPayer ?? false
      )

      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = isdocName
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      onDownload()
    } catch (error) {
      console.error('Error downloading ISDOC:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Sdílená faktura {invoice.number}
        </h1>
        <select
          className="border rounded px-2 py-1"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'cs' | 'en')}
        >
          <option value="cs">Česky</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="flex justify-center">
        <PDFViewer
          style={{ width: '70vw', height: '1100px' }}
          showToolbar={false}
        >
          <PdfComponent {...docProps} />
        </PDFViewer>
      </div>

      <div className="rounded-lg border bg-background p-5 shadow-sm">
        <h4 className="text-lg font-semibold text-foreground">
          Stažení faktury
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Stáhněte si fakturu ve formátu PDF nebo ISDOC.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <PDFDownloadLink
            document={<PdfComponent {...docProps} />}
            onClick={onDownload}
            fileName={pdfName}
          >
            <Button className="w-full sm:w-32">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </PDFDownloadLink>
          <Button
            className="w-full sm:w-32"
            variant="outline"
            onClick={handleIsdocDownload}
          >
            <Download className="mr-2 h-4 w-4" /> ISDOC
          </Button>
        </div>
      </div>
    </div>
  )
}
