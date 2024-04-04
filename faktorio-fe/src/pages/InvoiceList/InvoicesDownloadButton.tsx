import { Button } from '@/components/ui/button'
import {
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenu
} from '@/components/ui/dropdown-menu'
import {
  FileArchiveIcon,
  FileSpreadsheetIcon,
  DownloadIcon
} from 'lucide-react'
import { useFilteredInvoicesQuery } from './InvoiceList'
import Papa from 'papaparse'

export function InvoicesDownloadButton() {
  const q = useFilteredInvoicesQuery()
  const invoices = q.data ?? []
  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Stáhnout
          </Button>
        </DropdownMenuTrigger> 
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async () => {
              const csv = Papa.unparse(invoices)

              const firstInvoice = invoices[0]
              const lastInvoice = invoices[invoices.length - 1]
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `invoices_${lastInvoice.number}_${firstInvoice.number}.csv`
              a.click()
              document.body.removeChild(a)
            }}
          >
            <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              alert('bohužel tato funkce není dostupná')
            }}
          >
            <FileArchiveIcon className="mr-2 h-4 w-4" />
            ZIP
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
