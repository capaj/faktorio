import React from 'react'
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { RemoveDialogUncontrolled } from '@/components/RemoveDialog'
import {
  LucideEllipsisVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Link } from 'wouter'
import { formatNumberWithSpaces } from '@/pages/formatNumberWithSpaces' // Adjust path if needed
import { InvoicesDownloadButton } from '@/pages/InvoiceList/InvoicesDownloadButton' // Adjust path if needed
import { IsdocDownloadButton } from '@/components/IsdocDownloadButton'

// Define the shape of an invoice - adjust based on your actual data structure
// This might need refinement based on the exact structure from your tRPC query
import { invoicesTb } from 'faktorio-db/schema'
import { InferSelectModel } from 'drizzle-orm'
import { toast } from 'sonner'

export type Invoice = Pick<
  InferSelectModel<typeof invoicesTb>,
  | 'id'
  | 'number'
  | 'client_name'
  | 'taxable_fulfillment_due'
  | 'issued_on'
  | 'sent_at'
  | 'due_on'
  | 'total'
  | 'native_total'
  | 'native_subtotal'
  | 'subtotal'
  | 'currency'
  | 'paid_on'
  | 'client_vat_no'
  | 'exchange_rate'
>

// Helper type for currency totals
type CurrencyTotals = {
  [currency: string]: {
    total: number
    subtotal: number
    count: number
  }
}

interface InvoiceTableProps {
  invoices: Invoice[]
  isLoading: boolean
  onDelete?: (id: string) => Promise<void>
  onMarkAsPaid?: (id: string, number: string) => void
  onMarkAsUnpaid?: (id: string) => Promise<void>
  showTotals?: boolean
  year?: number | null
  search?: string
  // Add any other props needed, e.g., specific mutation status if needed inside the table
}

export function IssuedInvoiceTable({
  invoices,
  isLoading,
  onDelete,
  onMarkAsPaid,
  onMarkAsUnpaid,
  showTotals = true, // Default to showing totals
  year,
  search
}: InvoiceTableProps) {
  // Determine if we should show full year in dates
  const showFullYear = year === null || year === undefined

  const [invoiceIdsToDelete, setInvoiceIdsToDelete] = React.useState<
    Set<string>
  >(new Set())
  const today = new Date(new Date().toDateString())
  const [expandedMobileCards, setExpandedMobileCards] = React.useState<
    Set<string>
  >(new Set())

  const renderPaymentBadge = (invoice: Invoice) => {
    const isOverdue =
      invoice.due_on &&
      !invoice.paid_on &&
      new Date(invoice.due_on) < today

    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium'

    if (invoice.paid_on) {
      return (
        <span className={`${baseClass} bg-green-100 text-green-800`}>
          {formatCzechDate(invoice.paid_on)}
        </span>
      )
    }

    if (isOverdue) {
      return (
        <span className={`${baseClass} bg-red-100 text-red-800`}>
          Po splatnosti
        </span>
      )
    }

    return (
      <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>
        Nezaplaceno
      </span>
    )
  }

  const renderActionMenu = (invoice: Invoice) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="bg-gray-200">
          <LucideEllipsisVertical className="h-5 w-5 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="cursor-pointer">
        <DropdownMenuItem>
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="flex w-full"
          >
            <Pencil size={16} strokeWidth="1.5" />
            <span className="ml-2">Editovat</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href={`/invoices/${invoice.id}`} className="flex w-full">
            <Eye size={16} strokeWidth="1.5" />
            <span className="ml-2">Zobrazit PDF</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <div className="flex w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M10 13v4" />
              <path d="M14 13v4" />
            </svg>
            <IsdocDownloadButton
              invoiceId={invoice.id}
              variant="ghost"
              size="sm"
              className="ml-2 p-0 h-auto hover:bg-transparent"
            >
              Stáhnout ISDOC
            </IsdocDownloadButton>
          </div>
        </DropdownMenuItem>

        {!invoice.paid_on && onMarkAsPaid && (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => e.preventDefault()}
            onClick={() => onMarkAsPaid(invoice.id, invoice.number)}
          >
            <CheckCircle size={16} strokeWidth="1.5" className="text-green-600" />
            <span className="ml-2">Označit jako zaplacené</span>
          </DropdownMenuItem>
        )}

        {invoice.paid_on && onMarkAsUnpaid && (
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700 focus:bg-red-50"
            onSelect={(e) => e.preventDefault()}
            onClick={async () => {
              await onMarkAsUnpaid(invoice.id)
            }}
          >
            <XCircle size={16} strokeWidth="1.5" />
            <span className="ml-2">Označit jako nezaplacené</span>
          </DropdownMenuItem>
        )}

        {onDelete && (
          <RemoveDialogUncontrolled
            title={
              <span>
                Opravdu chcete smazat fakturu <strong>{invoice.number}</strong>?
              </span>
            }
            onRemove={async () => {
              const takeBackTimeout = 1000 * 10
              const invoiceIdToDelete = invoice.id
              const timeoutId = setTimeout(async () => {
                await onDelete(invoiceIdToDelete)
                toast.success('Faktura smazána.')
              }, takeBackTimeout)
              toast('Faktura bude smazána za 10 sekund.', {
                duration: takeBackTimeout,
                action: {
                  label: 'Zrušit smazání',
                  onClick: () => {
                    clearTimeout(timeoutId)
                    setInvoiceIdsToDelete((prev) => {
                      prev.delete(invoiceIdToDelete)
                      return new Set(prev)
                    })
                  }
                }
              })
              setInvoiceIdsToDelete(
                (prev) => new Set(prev.add(invoiceIdToDelete))
              )
            }}
          >
            <DropdownMenuItem className="cursor-pointer">
              <Trash2 size={16} strokeWidth="1.5" />
              <span className="ml-2">Smazat</span>
            </DropdownMenuItem>
          </RemoveDialogUncontrolled>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Helper function to format dates in Czech format
  function formatCzechDate(dateString: string | null): string {
    if (!dateString) return ''

    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    if (showFullYear) {
      return `${day}.${month}.${year}`
    } else {
      return `${day}.${month}.`
    }
  }

  const currencyTotals = invoices.reduce<CurrencyTotals>((acc, invoice) => {
    const currency = invoice.currency || 'N/A' // Handle potential null/undefined currency
    if (!acc[currency]) {
      acc[currency] = { total: 0, subtotal: 0, count: 0 }
    }
    acc[currency].total += invoice.total
    acc[currency].subtotal += invoice.subtotal ?? 0
    acc[currency].count += 1
    return acc
  }, {})

  // Calculate total sum converted to CZK
  const totalSumCZK = invoices.reduce((acc, invoice) => {
    let amountInCZK = invoice.total
    if (invoice.currency !== 'CZK' && invoice.exchange_rate) {
      amountInCZK = invoice.total * invoice.exchange_rate
    } else if (invoice.currency !== 'CZK') {
      // Handle cases where exchange rate might be missing for non-CZK invoices
      // For now, we'll skip them in the total sum, but you might want a different handling
      console.warn(
        `Missing exchange rate for non-CZK invoice ${invoice.number}`
      )
      return acc
    }
    return acc + amountInCZK
  }, 0)
  const totalVAT = invoices.reduce((acc, invoice) => {
    // Assuming native_total includes VAT, we can calculate VAT as:
    const vat = (invoice.native_total ?? 0) - invoice.native_subtotal
    return acc + (vat > 0 ? vat : 0) // Only add positive VAT amounts
  }, 0)

  const sortedCurrencies = Object.keys(currencyTotals).sort()

  const toggleExpanded = (id: string) => {
    setExpandedMobileCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">Nr.</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Zdanitelné plnění datum</TableHead>
              <TableHead>Vystaveno dne</TableHead>
              <TableHead>Odesláno</TableHead>
              <TableHead>Datum platby</TableHead>
              <TableHead>bez DPH</TableHead>
              <TableHead>s DPH</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) =>
              invoiceIdsToDelete.has(invoice.id) ? null : (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${invoice.id}/?language=cs`}>
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>
                    {formatCzechDate(invoice.taxable_fulfillment_due)}
                  </TableCell>
                  <TableCell>{formatCzechDate(invoice.issued_on)}</TableCell>
                  <TableCell>{formatCzechDate(invoice.sent_at)}</TableCell>
                  <TableCell>{renderPaymentBadge(invoice)}</TableCell>
                  <TableCell>
                    {invoice.subtotal} {invoice.currency}
                    {invoice.currency !== 'CZK' &&
                      invoice.exchange_rate &&
                      invoice.subtotal && (
                        <div className="text-xs text-gray-500">
                          ({invoice.exchange_rate * invoice.subtotal} CZK)
                        </div>
                      )}
                  </TableCell>
                  <TableCell>
                    {invoice.total} {invoice.currency}
                  </TableCell>

                  <TableCell className="text-right">
                    {renderActionMenu(invoice)}
                  </TableCell>
                </TableRow>
              )
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Načítám faktury...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Žádné faktury k zobrazení.
                </TableCell>
              </TableRow>
            )}

            {showTotals && !isLoading && invoices.length > 0 && (
              <>
                {/* Dynamically render rows for each currency */}
                {sortedCurrencies.map((currency) => (
                  <TableRow key={currency} className="bg-gray-100 font-medium">
                    <TableCell colSpan={5}>
                      Celkem {currencyTotals[currency].count}{' '}
                      {currencyTotals[currency].count === 1
                        ? 'faktura'
                        : currencyTotals[currency].count > 1 &&
                            currencyTotals[currency].count < 5
                          ? 'faktury'
                          : 'faktur'}{' '}
                      v {currency}
                    </TableCell>
                    <TableCell></TableCell> {/* Empty cell for alignment */}
                    <TableCell className="whitespace-nowrap">
                      {formatNumberWithSpaces(currencyTotals[currency].subtotal)}{' '}
                      {currency}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatNumberWithSpaces(currencyTotals[currency].total)}{' '}
                      {currency}
                    </TableCell>
                    <TableCell className="text-right"></TableCell>{' '}
                    {/* Empty action cell */}
                  </TableRow>
                ))}

                {/* Overall Total Count, Sum, and Download Row - Only show if multiple currencies */}
                {Object.keys(currencyTotals).length > 1 && (
                  <TableRow className="bg-gray-200 font-semibold">
                    <TableCell colSpan={3}>
                      {' '}
                      {/* Adjusted colspan to push sum next to button */}
                      Ve všech měnách {invoices.length}{' '}
                      {invoices.length === 1
                        ? 'faktura'
                        : invoices.length > 1 && invoices.length < 5
                          ? 'faktury'
                          : 'faktur'}
                    </TableCell>
                    <TableCell colSpan={3} className="text-right font-light">
                      Celkem částka DPH:{' '}
                      <span className="font-bold text-yellow-800">
                        {formatNumberWithSpaces(totalVAT)} CZK
                      </span>
                    </TableCell>

                    <TableCell
                      colSpan={1}
                      className="text-left whitespace-nowrap"
                    >
                      {formatNumberWithSpaces(
                        invoices.reduce(
                          (acc, inv) => acc + inv.native_subtotal,
                          0
                        )
                      )}{' '}
                      CZK
                    </TableCell>
                    {/* Display the total sum in CZK */}
                    <TableCell
                      colSpan={1}
                      className="text-left whitespace-nowrap"
                    >
                      {formatNumberWithSpaces(totalSumCZK)} CZK
                    </TableCell>

                    <TableCell className="text-right">
                      {year !== undefined && search !== undefined && (
                        <InvoicesDownloadButton year={year} search={search} />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-600">
            Načítám faktury...
          </div>
        )}
        {!isLoading && invoices.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-600">
            Žádné faktury k zobrazení.
          </div>
        )}

        {!isLoading &&
          invoices
            .filter((invoice) => !invoiceIdsToDelete.has(invoice.id))
            .map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/invoices/${invoice.id}/?language=cs`}
                      className="text-lg font-semibold text-slate-800 underline-offset-2 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    <div className="mt-1 text-sm text-gray-500">
                      {invoice.client_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">s DPH</div>
                      <div className="text-base font-bold text-gray-900">
                        {invoice.total
                          ? `${invoice.total} ${invoice.currency}`
                          : '—'}
                      </div>
                    </div>
                    {renderActionMenu(invoice)}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Stav</span>
                    {renderPaymentBadge(invoice)}
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-medium text-slate-700"
                    onClick={() => toggleExpanded(invoice.id)}
                  >
                    {expandedMobileCards.has(invoice.id) ? 'Skrýt detaily' : 'Zobrazit detaily'}
                    {expandedMobileCards.has(invoice.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expandedMobileCards.has(invoice.id) && (
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div className="text-gray-500">Zdanitelné plnění</div>
                    <div className="font-medium text-gray-900">
                      {formatCzechDate(invoice.taxable_fulfillment_due) || '—'}
                    </div>
                    <div className="text-gray-500">Vystaveno</div>
                    <div className="text-gray-900">
                      {formatCzechDate(invoice.issued_on) || '—'}
                    </div>
                    <div className="text-gray-500">Odesláno</div>
                    <div className="text-gray-900">
                      {formatCzechDate(invoice.sent_at) || '—'}
                    </div>
                    {invoice.due_on && (
                      <>
                        <div className="text-gray-500">Splatnost</div>
                        <div className="text-gray-900">
                          {formatCzechDate(invoice.due_on)}
                        </div>
                      </>
                    )}
                    <div className="text-gray-500">bez DPH</div>
                    <div className="text-gray-900">
                      {invoice.subtotal
                        ? `${invoice.subtotal} ${invoice.currency}`
                        : '—'}
                    </div>
                    <div className="text-gray-500">s DPH</div>
                    <div className="font-semibold text-gray-900">
                      {invoice.total
                        ? `${invoice.total} ${invoice.currency}`
                        : '—'}
                    </div>
                  </div>
                )}
              </div>
            ))}

        {showTotals && !isLoading && invoices.length > 0 && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-700">Souhrn</div>
            <div className="mt-2 space-y-2 text-sm">
              {sortedCurrencies.map((currency) => (
                <div key={currency} className="flex items-center justify-between">
                  <span className="text-gray-700">
                    {currencyTotals[currency].count}{' '}
                    {currencyTotals[currency].count === 1
                      ? 'faktura'
                      : currencyTotals[currency].count > 1 &&
                          currencyTotals[currency].count < 5
                        ? 'faktury'
                        : 'faktur'}{' '}
                    v {currency}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatNumberWithSpaces(currencyTotals[currency].total)}{' '}
                    {currency}
                  </span>
                </div>
              ))}

              {Object.keys(currencyTotals).length > 1 && (
                <>
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
                    <span className="text-gray-700">Celkem částka DPH</span>
                    <span className="font-semibold text-yellow-800">
                      {formatNumberWithSpaces(totalVAT)} CZK
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Celkem v CZK</span>
                    <span className="font-semibold text-gray-900">
                      {formatNumberWithSpaces(totalSumCZK)} CZK
                    </span>
                  </div>
                  {year !== undefined && search !== undefined && (
                    <div className="pt-1">
                      <InvoicesDownloadButton year={year} search={search} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
