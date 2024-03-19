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
import { useAuth } from '@clerk/clerk-react'
import { LucideEllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

import { Link } from 'wouter'

export function InvoiceList() {
  const q = trpcClient.invoices.all.useQuery()
  const deleteInvoice = trpcClient.invoices.delete.useMutation()

  if (q.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Table>
      {(q.data?.length ?? 0) > 1 && (
        <TableCaption>Celkem {q.data?.length}</TableCaption>
      )}
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Nr.</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Celkem</TableHead>

          <TableHead>Zdanitelné plnění datum</TableHead>
          <TableHead className="">Odesláno</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {q?.data.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link href={`/invoices/${invoice.id}`}>{invoice.number}</Link>
            </TableCell>

            <TableCell>{invoice.client_name}</TableCell>
            <TableCell>{invoice.total}</TableCell>
            <TableCell>{invoice.taxable_fulfillment_due}</TableCell>
            <TableCell>{invoice.sent_at}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="bg-gray-200">
                    <LucideEllipsisVertical className="h-5 w-5 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="cursor-pointer">
                  <DropdownMenuItem>
                    <Link href={`/invoices/${invoice.id}`} className={'flex'}>
                      <Pencil size={16} strokeWidth="1.5" />
                      <span className="ml-2">Editovat</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
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
                      <Trash2 size={16} strokeWidth="1.5" />

                      <span className="ml-2">Smazat</span>
                    </RemoveDialogUncontrolled>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
