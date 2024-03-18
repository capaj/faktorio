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
import { useEffect } from 'react'
import { Link } from 'wouter'

export function InvoiceList() {
  const q = trpcClient.invoices.all.useQuery()

  if (q.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Table>
      {(q.data?.length ?? 0) > 1 && (
        <TableCaption>Celkem {q.data?.length} faktury</TableCaption>
      )}
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Nr.</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Celkem</TableHead>

          <TableHead className="text-right">Zdanitelné plnění datum</TableHead>
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
            <TableCell className="text-right">
              {invoice.taxable_fulfillment_due}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
