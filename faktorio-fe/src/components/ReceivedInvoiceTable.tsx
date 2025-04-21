import React from 'react'
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  Table
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2Icon, Loader2 } from 'lucide-react' // Keep used icons

// Define the shape of a received invoice
interface ReceivedInvoice {
  id: string
  supplier_name: string | null
  invoice_number: string | null
  issue_date: string | null
  due_date: string | null
  total_without_vat: number | null
  total_with_vat: number
  currency: string
  status: 'received' | 'verified' | 'disputed' | 'paid' | string // Use known statuses or allow string
}

interface ReceivedInvoiceTableProps {
  invoices: ReceivedInvoice[]
  isLoading?: boolean
  onDelete?: (id: string) => Promise<void> // Optional delete handler
  isDeleting?: boolean // Optional flag for delete loading state
  deletingId?: string | null // Optional ID of invoice being deleted
  showTotals?: boolean
}

export function ReceivedInvoiceTable({
  invoices,
  isLoading,
  onDelete,
  isDeleting,
  deletingId
}: ReceivedInvoiceTableProps) {
  // Calculate totals
  const totalWithoutVatSum = invoices.reduce(
    (sum, inv) => sum + (inv.total_without_vat ?? 0),
    0
  )
  const totalWithVatSum = invoices.reduce(
    (sum, inv) => sum + inv.total_with_vat,
    0
  )
  // Determine currency (assuming all invoices in the list have the same currency)
  const currency = invoices.length > 0 ? invoices[0].currency : ''

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString() // Simple localization for now
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dodavatel</TableHead>
          <TableHead>Číslo faktury</TableHead>
          <TableHead>Datum vystavení</TableHead>
          <TableHead>Datum splatnosti</TableHead>
          <TableHead className="text-right">Celkem bez DPH</TableHead>
          <TableHead className="text-right">Celkem s DPH</TableHead>
          <TableHead>Stav</TableHead>
          {onDelete && <TableHead className="text-right">Akce</TableHead>}{' '}
          {/* Show actions only if handler provided */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={onDelete ? 8 : 7} className="text-center">
              Načítám přijaté faktury...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && invoices.length === 0 && (
          <TableRow>
            <TableCell colSpan={onDelete ? 8 : 7} className="text-center">
              Žádné přijaté faktury k zobrazení.
            </TableCell>
          </TableRow>
        )}
        {!isLoading &&
          invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                {invoice.supplier_name}
              </TableCell>
              <TableCell>{invoice.invoice_number}</TableCell>
              <TableCell>{invoice.issue_date}</TableCell>
              <TableCell>{invoice.due_date}</TableCell>
              <TableCell className="text-right">
                {formatNumber(invoice.total_without_vat)} {invoice.currency}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(invoice.total_with_vat)} {invoice.currency}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'disputed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {/* Simple status display, could be improved */}
                  {invoice.status}
                </span>
              </TableCell>
              {onDelete && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(invoice.id)}
                    disabled={isDeleting && deletingId === invoice.id}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                    aria-label="Smazat fakturu"
                  >
                    {isDeleting && deletingId === invoice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
      </TableBody>
      {!isLoading && invoices.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-medium">
              Celkem
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(totalWithoutVatSum)} {currency}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(totalWithVatSum)} {currency}
            </TableCell>
            {/* Adjust colspan based on whether actions column is present */}
            <TableCell colSpan={onDelete ? 2 : 1}></TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
