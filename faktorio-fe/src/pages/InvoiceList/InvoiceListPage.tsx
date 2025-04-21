import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { trpcClient } from '@/lib/trpcClient'

import { useState } from 'react' // Import useState
import { Input } from '@/components/ui/input'
import { useQueryParamState } from './useQueryParamState'
import { MarkAsPaidDialog } from './MarkAsPaidDialog'
import { InvoiceTable } from '@/components/InvoiceTable'

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

  // Define handler functions to pass to InvoiceTable
  const handleDeleteInvoice = async (id: string) => {
    await deleteInvoice.mutateAsync({ id })
    q.refetch()
  }

  const handleMarkAsUnpaid = async (id: string) => {
    await markAsUnpaidMutation.mutateAsync({ id, paidOn: null })
    // Refetch happens via the mutation's onSuccess
  }

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
      <InvoiceTable
        invoices={invoices}
        isLoading={q.isLoading}
        onDelete={handleDeleteInvoice}
        onMarkAsPaid={handleOpenMarkAsPaidDialog}
        onMarkAsUnpaid={handleMarkAsUnpaid}
        showTotals={true}
        year={selectedYear}
        search={search}
      />

      {markAsPaidInvoice && (
        <MarkAsPaidDialog
          open={!!markAsPaidInvoice}
          onOpenChange={(isOpen) => {
            if (!isOpen) setMarkAsPaidInvoice(null)
          }}
          invoiceId={markAsPaidInvoice.id}
          invoiceNumber={markAsPaidInvoice.number}
          onSuccess={() => {
            q.refetch()
            setMarkAsPaidInvoice(null)
          }}
        />
      )}
    </>
  )
}
