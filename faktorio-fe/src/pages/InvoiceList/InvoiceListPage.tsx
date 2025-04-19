import { RemoveDialogUncontrolled } from '@/components/RemoveDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { trpcClient } from '@/lib/trpcClient'
import {
  LucideEllipsisVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react' // Import XCircle

import { useState } from 'react' // Import useState
import { Link } from 'wouter'
import { formatNumberWithSpaces } from '../formatNumberWithSpaces'
import { InvoicesDownloadButton } from './InvoicesDownloadButton'
import { Input } from '@/components/ui/input'
import { useQueryParamState } from './useQueryParamState'
import { MarkAsPaidDialog } from './MarkAsPaidDialog'

export function useFilteredInvoicesQuery(
  search: string = '',
  year?: number | null // Add year parameter
) {
  return trpcClient.invoices.listInvoices.useQuery({
    filter: search,
    limit: 100,
    year: year // Pass year to the query
  })
}

export function InvoiceListPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear)
  const [search, setSearch] = useQueryParamState('search')
  const q = useFilteredInvoicesQuery(search, selectedYear) // Pass selectedYear
  // State to manage which invoice's "Mark as Paid" dialog is open
  const [markAsPaidInvoice, setMarkAsPaidInvoice] = useState<{
    id: string
    number: string
  } | null>(null)

  const deleteInvoice = trpcClient.invoices.delete.useMutation()
  // Mutation hook for marking as unpaid directly from the menu
  const markAsUnpaidMutation = trpcClient.invoices.markAsPaid.useMutation({
    onSuccess: () => {
      q.refetch() // Refetch data after marking as unpaid
    },
    onError: (error) =>
      console.error('Failed to mark invoice as unpaid:', error)
  })

  const handleOpenMarkAsPaidDialog = (
    invoiceId: string,
    invoiceNumber: string
  ) => {
    setMarkAsPaidInvoice({ id: invoiceId, number: invoiceNumber })
  }

  const invoices = q.data ?? []
  const total = invoices.reduce((acc, invoice) => acc + invoice.total, 0)
  return (
    <>
      <div className="flex items-center justify-between m-4">
        <Input
          value={search}
          className="max-w-[50%]"
          onChange={(e) => {
            return setSearch(e.target.value)
          }}
          placeholder="Hledat faktury podle jména klienta, IČO, DIČ nebo čísla faktury"
        ></Input>

        <Select
          value={selectedYear === null ? 'null' : selectedYear.toString()}
          onValueChange={(value) => {
            if (value === 'null') {
              setSelectedYear(null)
            } else {
              setSelectedYear(parseInt(value))
            }
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Rok" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Všechny</SelectItem>
            {[...Array(6)].map((_, i) => {
              const year = currentYear - i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[100px]">Nr.</TableHead>
            <TableHead>Klient</TableHead>

            <TableHead>Zdanitelné plnění datum</TableHead>
            <TableHead>Vystaveno dne</TableHead>
            <TableHead className="">Odesláno</TableHead>
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
                  className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.paid_on ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
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
                        // Prevent default closing and trigger dialog open
                        onSelect={(e) => e.preventDefault()} // Use onSelect for DropdownMenuItem to prevent closing
                        onClick={() =>
                          handleOpenMarkAsPaidDialog(invoice.id, invoice.number)
                        }
                      >
                        <CheckCircle
                          size={16}
                          strokeWidth="1.5"
                          className="text-green-600"
                        />
                        <span className="ml-2">Označit jako zaplacené</span>
                      </DropdownMenuItem>
                    )}

                    {/* Add Mark as Unpaid option if already paid */}
                    {invoice.paid_on && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-700 focus:bg-red-50" // Optional: style differently
                        onSelect={(e) => e.preventDefault()} // Prevent closing
                        onClick={async () => {
                          // Call mutation to mark as unpaid (paidOn: null)
                          await markAsUnpaidMutation.mutateAsync({
                            id: invoice.id,
                            paidOn: null
                          })
                        }}
                        disabled={markAsUnpaidMutation.isPending} // Disable while mutating
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
                        await deleteInvoice.mutateAsync({ id: invoice.id })
                        q.refetch()
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
          {q.isLoading && <p>Načítám faktury...</p>}

          {invoices.length > 0 && (
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
              <TableCell>
                {formatNumberWithSpaces(
                  q.data?.reduce(
                    (acc, invoice) => acc + (invoice.subtotal ?? 0),
                    0
                  ) ?? 0
                )}{' '}
                CZK
              </TableCell>
              <TableCell>
                <InvoicesDownloadButton year={selectedYear} search={search} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Render the dialog outside the table/dropdown structure */}
      {markAsPaidInvoice && (
        <MarkAsPaidDialog
          open={!!markAsPaidInvoice}
          onOpenChange={(isOpen) => {
            if (!isOpen) setMarkAsPaidInvoice(null) // Close dialog by resetting state
          }}
          invoiceId={markAsPaidInvoice.id}
          invoiceNumber={markAsPaidInvoice.number}
          onSuccess={() => {
            q.refetch() // Refetch data on success
            setMarkAsPaidInvoice(null) // Ensure dialog closes on success too
          }}
        />
      )}
    </>
  )
}
