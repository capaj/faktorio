import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'

import { CzechInvoicePDF } from './CzechInvoicePDF'
import { Button } from '@/components/ui/button'
import { snakeCase } from 'lodash-es'
import { useLocation, useParams, useSearchParams } from 'wouter'
import { useState } from 'react'
import { trpcClient } from '@/lib/trpcClient'
import { EnglishInvoicePDF } from './EnglishInvoicePDF'
import { generateIsdocXml } from '@/lib/isdoc/generateIsdocXml'
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
import {
  LucideEdit,
  Copy as CopyIcon,
  Trash2,
  Eye,
  Download
} from 'lucide-react'
import { useQRCodeBase64 } from '@/lib/useQRCodeBase64'
import { generateQrPaymentString } from '@/lib/qrCodeGenerator'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrimaryBankAccount } from '@/lib/getPrimaryBankAccount'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

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
)
  .extend({
    your_name: z.string().optional(),
    items: z.array(invoiceItemFormSchema),
    bank_account: z.string().nullish(),
    iban: z.string().nullish(),
    swift_bic: z.string().nullish()
  })
  .refine((data) => data.bank_account || data.iban, {
    message: 'Either bank_account or iban must be provided',
    path: ['bank_account']
  })

export const InvoiceDetail = ({
  invoice
}: {
  invoice: SelectInvoiceType & { items: InsertInvoiceItemType[] }
}) => {
  const params = useParams()
  const isLocalUser = localStorage.getItem('auth_token')?.startsWith('local_')
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()
  const primaryBankAccount = getPrimaryBankAccount(invoicingDetails)
  const pdfName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}.pdf`
  const [searchParams] = useSearchParams()
  const language = searchParams.get('language') ?? invoice.language
  const [_location, navigate] = useLocation()

  const handleIsdocDownload = () => {
    try {
      const isVatPayer = Boolean(invoicingDetails?.vat_payer)
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
    }
  }

  const invoiceTotal = invoice.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  const taxTotal = invoice.items.reduce((acc, item) => {
    const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
    const vat = invoicingDetails?.vat_payer ? (item.vat_rate ?? 0) : 0
    return acc + total * (vat / 100)
  }, 0)

  const generatedQrString = generateQrPaymentString({
    accountNumber:
      invoice.iban?.replace(/\s/g, '') ?? invoice.bank_account ?? null,
    amount: invoiceTotal + taxTotal,
    currency: invoice.currency,
    variableSymbol: invoice.number?.replace('-', ''),
    message: 'Faktura ' + invoice.number
  })

  const qrPayload =
    (primaryBankAccount.qrcode_decoded &&
    primaryBankAccount.qrcode_decoded.length > 0
      ? primaryBankAccount.qrcode_decoded
      : generatedQrString) || null

  const qrCodeBase64 = useQRCodeBase64(qrPayload)

  const PdfContent = language === 'cs' ? CzechInvoicePDF : EnglishInvoicePDF
  const formattedIssuedOn = djs(invoice.issued_on).format('D. M. YYYY')
  const formattedTaxableDue = djs(invoice.taxable_fulfillment_due).format(
    'D. M. YYYY'
  )
  const formattedDueOn = djs(invoice.issued_on)
    .add(invoice.due_in_days ?? 0, 'day')
    .format('D. M. YYYY')
  const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: invoice.currency
  })
  const formattedTotal = currencyFormatter.format(invoiceTotal + taxTotal)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-muted/20 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <div className="rounded-lg border bg-background p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Faktura
              </p>
              <h1 className="text-2xl font-semibold text-foreground">
                {invoice.number}
              </h1>
              <p className="text-sm text-muted-foreground">
                Vystaveno {formattedIssuedOn} · Zdanitelné plnění{' '}
                {formattedTaxableDue}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Splatnost
                </p>
                <p className="text-base font-medium text-foreground">
                  {formattedDueOn}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Celkem k úhradě
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formattedTotal}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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

                <Button
                  variant="outline"
                  onClick={() => {
                    navigate(`/invoices/${params.invoiceId}/edit`)
                  }}
                >
                  <LucideEdit />
                  Upravit
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div
            className="flex items-stretch justify-center bg-muted"
            style={{
              minHeight: '700px',
              height: '1188px'
            }}
          >
            <PDFViewer
              key={`${invoice.id}-${language}-${!!qrCodeBase64}`}
              showToolbar={false}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            >
              <PdfContent
                invoiceData={invoice}
                qrCodeBase64={qrCodeBase64}
                vatPayer={invoicingDetails?.vat_payer}
              />
            </PDFViewer>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-foreground">
            Stažení faktury
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Uložte si dokument nebo ho sdílejte ve formátu PDF či ISDOC.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <PDFDownloadLink
              document={
                <PdfContent
                  invoiceData={invoice}
                  qrCodeBase64={qrCodeBase64 ?? ''}
                  vatPayer={invoicingDetails?.vat_payer}
                />
              }
              fileName={pdfName ?? ''}
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

        {!isLocalUser && (
          <div className="rounded-lg border bg-background p-5 shadow-sm">
            <ShareControls invoiceId={invoice.id} />
          </div>
        )}
      </div>
    </div>
  )
}

function ShareControls({ invoiceId }: { invoiceId: string }) {
  const qc = useQueryClient()
  const listQuery = trpcClient.invoices.listShares.useQuery({ invoiceId })
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const shareStatsQuery = trpcClient.invoices.getShareStats.useQuery(
    { shareId: selectedShareId ?? '' },
    { enabled: !!selectedShareId }
  )
  const createShare = trpcClient.invoices.createShare.useMutation({
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
  const revokeShare = trpcClient.invoices.revokeShare.useMutation({
    onSuccess: () => qc.invalidateQueries()
  })

  const publicBase = location.origin

  const getCount = (
    share: unknown,
    key: 'view_count' | 'download_count'
  ): number => {
    const rec = share as Record<string, unknown>
    const val = rec[key]
    return typeof val === 'number' ? val : 0
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Sdílení faktury
        </h3>
        <Button
          size="sm"
          onClick={() => createShare.mutate({ invoiceId })}
          disabled={createShare.isPending}
        >
          Vytvořit odkaz
        </Button>
      </div>
      {listQuery.data && listQuery.data.length > 0 ? (
        <ul className="space-y-3">
          {listQuery.data.map((s) => {
            const link = `${publicBase}/shared-invoice/${s.id}`
            return (
              <li
                key={s.id}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      className="break-all text-blue-600 underline"
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link}
                    </a>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(link)
                          toast.success('Odkaz zkopírován')
                        }}
                      >
                        <CopyIcon className="mr-1 h-4 w-4" /> Kopírovat
                      </Button>
                      {!s.disabled_at && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeShare.mutate({ shareId: s.id })}
                          disabled={revokeShare.isPending}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Zneplatnit
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {getCount(s, 'view_count')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3 w-3" />{' '}
                      {getCount(s, 'download_count')}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedShareId(s.id)}
                    >
                      Detaily
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Zatím žádné odkazy
        </div>
      )}

      <Dialog
        open={!!selectedShareId}
        onOpenChange={(open) => !open && setSelectedShareId(null)}
      >
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Události sdílení</DialogTitle>
            <DialogDescription>
              Zobrazení, stažení a další akce pro tento odkaz
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {!shareStatsQuery.data ? (
              <div className="text-sm text-muted-foreground">Načítání…</div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Zobrazení:{' '}
                  {
                    shareStatsQuery.data.events.filter(
                      (e) => e.event_type === 'view'
                    ).length
                  }{' '}
                  · Stažení:{' '}
                  {
                    shareStatsQuery.data.events.filter(
                      (e) => e.event_type === 'download'
                    ).length
                  }
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Čas</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Země</TableHead>
                      <TableHead>User-Agent</TableHead>
                      <TableHead>Referer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shareStatsQuery.data.events.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>{ev.created_at}</TableCell>
                        <TableCell>{ev.event_type}</TableCell>
                        <TableCell>{ev.ip_address ?? ''}</TableCell>
                        <TableCell>{ev.country ?? ''}</TableCell>
                        <TableCell className="max-w-[280px] truncate">
                          {ev.user_agent ?? ''}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ev.referer ?? ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
