import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { trpcClient } from '@/lib/trpcClient'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useQueryParamState } from './useQueryParamState'
import { MarkAsPaidDialog } from './MarkAsPaidDialog'
import { IssuedInvoiceTable } from '@/components/IssuedInvoiceTable'
import { InvoicesDownloadButton } from './InvoicesDownloadButton'
import type { TRPCClientErrorLike } from '@trpc/client'
import type { UseQueryResult } from '@tanstack/react-query'
import type { AppRouter } from 'faktorio-api/src/trpcRouter'
import type { RouterOutputs } from '@/lib/trpcClient'

export function useFilteredInvoicesQuery(
  search: string = '',
  year?: number | null,
  contactId?: string
): UseQueryResult<
  RouterOutputs['invoices']['listInvoices'] | undefined,
  TRPCClientErrorLike<AppRouter>
> {
  return trpcClient.invoices.listInvoices.useQuery({
    filter: search,
    limit: contactId ? null : 100,
    year,
    ...(contactId ? { contactId } : {})
  })
}

export function InvoiceListPage() {
  const currentYear = new Date().getFullYear()
  const [contactId, setContactId] = useQueryParamState('contactId')
  const [year, setYear] = useQueryParamState('year')
  const defaultYear = contactId ? null : currentYear
  const selectedYear =
    year === 'all' ? null : /^\d{4}$/.test(year) ? Number(year) : defaultYear
  const [search, setSearch] = useQueryParamState('search')
  const q = useFilteredInvoicesQuery(
    search,
    selectedYear,
    contactId || undefined
  )
  const contactQuery = trpcClient.contacts.byId.useQuery(contactId, {
    enabled: !!contactId
  })
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
      {contactId && (
        <div className="mx-4 mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Faktury pro kontakt:{' '}
            <strong>{contactQuery.data?.name ?? 'Vybraný kontakt'}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={() => setContactId('')}>
            Zrušit filtr kontaktu
          </Button>
        </div>
      )}
      <div className="m-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          className="w-full sm:max-w-[60%]"
          onChange={(e) => {
            return setSearch(e.target.value)
          }}
          placeholder="Hledat faktury podle jména klienta, IČO, DIČ nebo čísla faktury"
        ></Input>

        <Select
          value={selectedYear === null ? 'all' : selectedYear.toString()}
          onValueChange={setYear}
        >
          <SelectTrigger className="w-full sm:w-[140px]" aria-label="Rok">
            <SelectValue placeholder="Rok" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
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
        <InvoicesDownloadButton
          invoices={invoices}
          year={selectedYear}
          search={search}
          contactId={contactId || undefined}
          disabled={q.isFetching || q.isError}
        />
      </div>
      <IssuedInvoiceTable
        invoices={invoices}
        isLoading={q.isLoading}
        onDelete={handleDeleteInvoice}
        onMarkAsPaid={handleOpenMarkAsPaidDialog}
        onMarkAsUnpaid={handleMarkAsUnpaid}
        showTotals={true}
        year={selectedYear}
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
