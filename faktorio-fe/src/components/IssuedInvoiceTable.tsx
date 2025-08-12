import React from 'react'
import {
  TableCaption,
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
  XCircle
} from 'lucide-react'
import { Link } from 'wouter'
import { formatNumberWithSpaces } from '@/pages/formatNumberWithSpaces' // Adjust path if needed
import { InvoicesDownloadButton } from '@/pages/InvoiceList/InvoicesDownloadButton' // Adjust path if needed

// Define the shape of an invoice - adjust based on your actual data structure
// This might need refinement based on the exact structure from your tRPC query
import { invoicesTb } from 'faktorio-db/schema'
import { InferSelectModel } from 'drizzle-orm'

export type Invoice = Pick<
  InferSelectModel<typeof invoicesTb>,
  | 'id'
  | 'number'
  | 'client_name'
  | 'taxable_fulfillment_due'
  | 'issued_on'
  | 'sent_at'
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

  return (
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
        {invoices.map((invoice) => (
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
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  invoice.paid_on
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.paid_on
                  ? formatCzechDate(invoice.paid_on)
                  : 'Nezaplaceno'}
              </span>
            </TableCell>
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
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="flex w-full"
                    >
                      <Pencil size={16} strokeWidth="1.5" />
                      <span className="ml-2">Zobrazit PDF</span>
                    </Link>
                  </DropdownMenuItem>

                  {!invoice.paid_on && onMarkAsPaid && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => onMarkAsPaid(invoice.id, invoice.number)}
                    >
                      <CheckCircle
                        size={16}
                        strokeWidth="1.5"
                        className="text-green-600"
                      />
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
                      // Consider passing mutation status if needed for disabling
                      // disabled={markAsUnpaidMutation.isPending}
                    >
                      <XCircle size={16} strokeWidth="1.5" />
                      <span className="ml-2">Označit jako nezaplacené</span>
                    </DropdownMenuItem>
                  )}

                  {onDelete && (
                    <RemoveDialogUncontrolled
                      title={
                        <span>
                          Opravdu chcete smazat fakturu{' '}
                          <strong>{invoice.number}</strong>?
                        </span>
                      }
                      onRemove={async () => {
                        await onDelete(invoice.id)
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
            </TableCell>
          </TableRow>
        ))}
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

                <TableCell colSpan={1} className="text-left whitespace-nowrap">
                  {formatNumberWithSpaces(
                    invoices.reduce((acc, inv) => acc + inv.native_subtotal, 0)
                  )}{' '}
                  CZK
                </TableCell>
                {/* Display the total sum in CZK */}
                <TableCell colSpan={1} className="text-left whitespace-nowrap">
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
  )
}
