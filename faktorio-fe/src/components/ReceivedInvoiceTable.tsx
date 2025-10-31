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
import { receivedInvoiceTb } from 'faktorio-db/schema'
import { InferSelectModel } from 'drizzle-orm'

export type ReceivedInvoice = Pick<
  InferSelectModel<typeof receivedInvoiceTb>,
  | 'id'
  | 'supplier_name'
  | 'supplier_vat_no'
  | 'invoice_number'
  | 'issue_date'
  | 'taxable_supply_date'
  | 'due_date'
  | 'total_without_vat'
  | 'total_with_vat'
  | 'currency'
  | 'status'
>

interface ReceivedInvoiceTableProps {
  invoices: ReceivedInvoice[]
  columns?: {
    textAlign?: string
    name: string
    label: string
  }[]
  onDelete?: (id: string) => Promise<void> // Optional delete handler
  isDeleting?: boolean // Optional flag for delete loading state
  deletingId?: string | null // Optional ID of invoice being deleted
  showTotals?: boolean
}

const defaultColumns = [
  {
    name: 'supplier_name',
    label: 'Dodavatel'
  },
  {
    name: 'invoice_number',
    label: 'Číslo faktury'
  },
  {
    name: 'issue_date',
    label: 'Datum vystavení'
  },
  {
    name: 'due_date',
    label: 'Datum splatnosti'
  },
  {
    name: 'vat_amount',
    label: 'Částka DPH',
    textAlign: 'right'
  },
  {
    name: 'total_without_vat',
    label: 'Celkem bez DPH',
    textAlign: 'right'
  },
  {
    name: 'total_with_vat',
    label: 'Celkem s DPH',
    textAlign: 'right'
  }
  // {
  //   name: 'status',
  //   label: 'Stav'
  // }
]

export function ReceivedInvoiceTable({
  invoices,
  columns = defaultColumns,
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

  const totalVatSum = invoices.reduce(
    (sum, inv) => sum + (inv.total_with_vat - (inv.total_without_vat ?? 0)),
    0
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns?.map((column) => (
            <TableHead
              className={column.textAlign === 'right' ? 'text-right' : ''}
              key={column.name}
            >
              {column.label}
            </TableHead>
          ))}
          {onDelete && <TableHead className="text-right">Akce</TableHead>}{' '}
          {/* Show actions only if handler provided */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 && (
          <TableRow>
            <TableCell colSpan={onDelete ? 8 : 7} className="text-center">
              Žádné přijaté faktury k zobrazení.
            </TableCell>
          </TableRow>
        )}
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              {invoice.supplier_name}
            </TableCell>
            <TableCell>{invoice.invoice_number}</TableCell>
            <TableCell>{invoice.issue_date}</TableCell>
            <TableCell>{invoice.due_date}</TableCell>
            <TableCell className="text-right">
              {formatNumber(
                invoice.total_with_vat - (invoice.total_without_vat ?? 0)
              )}
              {invoice.currency}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(invoice.total_without_vat)} {invoice.currency}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(invoice.total_with_vat)} {invoice.currency}
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
      {invoices.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-medium">
              Celkem
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(totalVatSum)} {currency}
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
