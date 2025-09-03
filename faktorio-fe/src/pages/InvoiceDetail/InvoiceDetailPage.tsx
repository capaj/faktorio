import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'

import { CzechInvoicePDF } from './CzechInvoicePDF'
import { Button } from '@/components/ui/button'
import { snakeCase } from 'lodash-es'
import { useLocation, useParams, useSearchParams } from 'wouter'
import { useState } from 'react'
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
import {
  LucideEdit,
  Copy as CopyIcon,
  Trash2,
  Eye,
  Download
} from 'lucide-react'
import { useQRCodeBase64 } from '@/lib/useQRCodeBase64'
import { generateQrPaymentString } from '@/lib/qrCodeGenerator'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  const pdfName = `${snakeCase(invoice.your_name ?? '')}-${invoice.number}.pdf`
  const [searchParams] = useSearchParams()
  const language = searchParams.get('language') ?? invoice.language
  const [_location, navigate] = useLocation()

  const invoiceTotal = invoice.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  const taxTotal = invoice.items.reduce((acc, item) => {
    const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
    const vat = invoicingDetails?.vat_payer ? (item.vat_rate ?? 0) : 0
    return acc + total * (vat / 100)
  }, 0)

  const qrCodeBase64 = useQRCodeBase64(
    generateQrPaymentString({
      accountNumber:
        invoice.iban?.replace(/\s/g, '') ?? invoice.bank_account ?? null,
      amount: invoiceTotal + taxTotal,
      currency: invoice.currency,
      variableSymbol: invoice.number?.replace('-', ''),
      message: 'Faktura ' + invoice.number
    })
  )

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
            key={`${invoice.id}-${language}-${!!qrCodeBase64}`}
            showToolbar={false}
            style={{
              width: '70vw',
              height: '1100px'
            }}
          >
            <PdfContent
              invoiceData={invoice}
              qrCodeBase64={qrCodeBase64}
              vatPayer={invoicingDetails?.vat_payer}
            />
          </PDFViewer>
        </div>

        <div className="flex content-center justify-center m-4">
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
            <Button variant={'default'}>Stáhnout {pdfName}</Button>
          </PDFDownloadLink>
        </div>

        {/* Share controls */}
        {!isLocalUser && <ShareControls invoiceId={invoice.id} />}
      </div>
    </>
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
    <div className="mb-4 border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Sdílení faktury</h3>
        <Button
          size="sm"
          className="text-xs"
          onClick={() => createShare.mutate({ invoiceId })}
          disabled={createShare.isPending}
        >
          Vytvořit odkaz
        </Button>
      </div>
      {listQuery.data && listQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {listQuery.data.map((s) => {
            const link = `${publicBase}/shared-invoice/${s.id}`
            return (
              <li key={s.id} className="flex items-center gap-2">
                <a
                  className="text-blue-600 underline break-all"
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link}
                </a>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" /> {getCount(s, 'view_count')}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Download className="w-3 h-3" />{' '}
                  {getCount(s, 'download_count')}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link)
                    toast.success('Odkaz zkopírován')
                  }}
                >
                  <CopyIcon className="w-4 h-4 mr-1" /> Kopírovat
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setSelectedShareId(s.id)}
                >
                  Detaily
                </Button>
                {!s.disabled_at && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => revokeShare.mutate({ shareId: s.id })}
                    disabled={revokeShare.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Zneplatnit
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">Zatím žádné odkazy</div>
      )}

      {/* Events modal */}
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
