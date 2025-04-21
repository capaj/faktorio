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
interface Invoice {
  id: string
  number: string
  client_name: string | null
  taxable_fulfillment_due: string | null // Assuming dates are strings
  issued_on: string | null
  sent_at: string | null
  total: number
  subtotal: number | null
  currency: string
  paid_on: string | null
}

interface InvoiceTableProps {
  invoices: Invoice[]
  isLoading: boolean
  onDelete: (id: string) => Promise<void>
  onMarkAsPaid: (id: string, number: string) => void
  onMarkAsUnpaid: (id: string) => Promise<void>
  showTotals?: boolean
  year?: number | null
  search?: string
  // Add any other props needed, e.g., specific mutation status if needed inside the table
}

export function InvoiceTable({
  invoices,
  isLoading,
  onDelete,
  onMarkAsPaid,
  onMarkAsUnpaid,
  showTotals = true, // Default to showing totals
  year,
  search
}: InvoiceTableProps) {
  const total = invoices.reduce((acc, invoice) => acc + invoice.total, 0)
  const subtotalSum = invoices.reduce(
    (acc, invoice) => acc + (invoice.subtotal ?? 0),
    0
  )

  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead className="w-[100px]">Nr.</TableHead>
          <TableHead>Klient</TableHead>
          <TableHead>Zdanitelné plnění datum</TableHead>
          <TableHead>Vystaveno dne</TableHead>
          <TableHead>Odesláno</TableHead>
          <TableHead>s DPH</TableHead>
          <TableHead>bez DPH</TableHead>
          <TableHead>Datum platby</TableHead>
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
            <TableCell>{invoice.taxable_fulfillment_due}</TableCell>
            <TableCell>{invoice.issued_on}</TableCell>
            <TableCell>{invoice.sent_at}</TableCell>
            <TableCell>
              {invoice.total} {invoice.currency}
            </TableCell>
            <TableCell>
              {invoice.subtotal} {invoice.currency}
            </TableCell>
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  invoice.paid_on
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.paid_on ? invoice.paid_on : 'Nezaplaceno'}
              </span>
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

                  {!invoice.paid_on && (
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

                  {invoice.paid_on && (
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
          <TableRow className="bg-gray-200">
            <TableCell colSpan={6}>
              Celkem {invoices.length}{' '}
              {invoices.length === 1
                ? 'faktura'
                : invoices.length > 4
                  ? 'faktur'
                  : 'faktury'}
            </TableCell>
            <TableCell>{formatNumberWithSpaces(total)} CZK</TableCell>
            <TableCell>{formatNumberWithSpaces(subtotalSum)} CZK</TableCell>
            <TableCell>
              {/* Conditionally render download button based on props */}
              {year !== undefined && search !== undefined && (
                <InvoicesDownloadButton year={year} search={search} />
              )}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
