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
import { trpcClient } from '@/lib/trpcClient'
import { LucideEllipsisVertical, Pencil, Trash2 } from 'lucide-react'

import { Link } from 'wouter'
import { formatNumberWithSpaces } from '../formatNumberWithSpaces'
import { InvoicesDownloadButton } from './InvoicesDownloadButton'
import { Input } from '@/components/ui/input'
import { useQueryParamState } from './useQueryParamState'

export function useFilteredInvoicesQuery(search: string = '') {
  return trpcClient.invoices.all.useQuery({
    filter: search,
    limit: 50
  })
}

export function InvoiceList() {
  const [search, setSearch] = useQueryParamState('search')
  const q = useFilteredInvoicesQuery(search)
  const deleteInvoice = trpcClient.invoices.delete.useMutation()

  const invoices = q.data ?? []
  const total = invoices.reduce((acc, invoice) => acc + invoice.total, 0)
  return (
    <>
      <Input
        value={search}
        className="m-4 max-w-[50%]"
        onChange={(e) => {
          return setSearch(e.target.value)
        }}
        placeholder="Hledat faktury podle jména klienta, IČO, DIČ nebo čísla faktury"
      ></Input>
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
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                <Link href={`/invoices/${invoice.id}/cs`}>
                  {invoice.number}
                </Link>
              </TableCell>

              <TableCell>{invoice.client_name}</TableCell>

              <TableCell>{invoice.taxable_fulfillment_due}</TableCell>
              <TableCell>{invoice.issued_on}</TableCell>
              <TableCell>{invoice.sent_at}</TableCell>
              <TableCell>{invoice.total} CZK</TableCell>
              <TableCell>{invoice.subtotal} CZK</TableCell>
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
                        className={'flex'}
                      >
                        <Pencil size={16} strokeWidth="1.5" />
                        <span className="ml-2">Editovat</span>
                      </Link>
                    </DropdownMenuItem>

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
          {q.isInitialLoading && <p>Načítám faktury...</p>}

          {invoices.length > 0 && (
            <TableRow className="bg-gray-200">
              <TableCell colSpan={5}>
                Celkem {q.data?.length}{' '}
                {q.data?.length === 1 ? 'faktura' : 'faktury'}
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
                <InvoicesDownloadButton />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  )
}
