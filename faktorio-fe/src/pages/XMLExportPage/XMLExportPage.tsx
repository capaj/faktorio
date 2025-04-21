import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { trpcClient } from '@/lib/trpcClient'
import { DownloadIcon } from 'lucide-react'
import { InvoiceTable } from '@/components/InvoiceTable'
import { ReceivedInvoiceTable } from '@/components/ReceivedInvoiceTable'

// Helper function to determine the last ended quarter
const getLastEndedQuarter = () => {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11
  const currentYear = now.getFullYear()

  // Determine the quarter (1-4)
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  // Calculate the year and quarter of the last ended quarter
  let lastEndedQuarterYear = currentYear
  let lastEndedQuarter = currentQuarter - 1

  if (lastEndedQuarter === 0) {
    lastEndedQuarter = 4
    lastEndedQuarterYear = currentYear - 1
  }

  return { year: lastEndedQuarterYear, quarter: lastEndedQuarter }
}

// Helper function to get date range for a quarter
function getQuarterDateRange(
  year: number,
  quarter: number
): { startDate: string; endDate: string } {
  const startMonth = (quarter - 1) * 3 // Q1->0, Q2->3, Q3->6, Q4->9
  const endMonth = startMonth + 2

  const startDate = new Date(year, startMonth, 1)
  const endDate = new Date(year, endMonth + 1, 0) // Day 0 of next month is last day of current month

  // Format as YYYY-MM-DD using local date components to avoid timezone issues
  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const result = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }

  return result
}

export function XMLExportPage() {
  const { year: initialYear, quarter: initialQuarter } = getLastEndedQuarter()
  const [selectedYear, setSelectedYear] = useState<number>(initialYear)
  const [selectedQuarter, setSelectedQuarter] = useState<number>(initialQuarter)

  const { startDate, endDate } = getQuarterDateRange(
    selectedYear,
    selectedQuarter
  )

  // Fetch issued invoices for the selected quarter
  const [issuedInvoices] = trpcClient.invoices.listInvoices.useSuspenseQuery({
    filter: '', // Keep empty search filter if needed
    from: startDate, // Use date range filtering based on backend schema
    to: endDate,
    vatMinimum: 1
  })

  // Fetch received invoices for the selected quarter
  // TODO: Verify the actual procedure name and input structure
  const [receivedInvoices] = trpcClient.receivedInvoices.list.useSuspenseQuery({
    // Use 'from' and 'to' as indicated by the previous linter error
    from: startDate,
    to: endDate
  })

  const handleDownloadXML = () => {
    // TODO: Implement XML generation and download logic
    alert('XML Download functionality not yet implemented.')
  }

  const currentDisplayYear = new Date().getFullYear()

  return (
    <>
      <div className="flex items-center justify-between m-4">
        <h3 className="text-xl font-semibold">Export XML pro finanční úřad</h3>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => {
              setSelectedYear(parseInt(value))
              // Reset quarter to 1 if year changes? Or keep the current quarter? Let's reset for simplicity for now.
              // setSelectedQuarter(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Rok" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(6)].map((_, i) => {
                const yearOption = currentDisplayYear - i
                return (
                  <SelectItem key={yearOption} value={yearOption.toString()}>
                    {yearOption}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select
            value={selectedQuarter.toString()}
            onValueChange={(value) => {
              setSelectedQuarter(parseInt(value))
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Kvartál" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => (
                <SelectItem key={q} value={q.toString()}>
                  Q{q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-md text-muted-foreground">
            {startDate} - {endDate}
          </span>
        </div>
      </div>

      {/* Display Issued Invoices */}
      <h4 className="text-lg font-semibold mt-4 mb-2">Vydané faktury</h4>
      <InvoiceTable
        invoices={issuedInvoices}
        isLoading={false}
        onDelete={async () => {
          /* No delete action here */
        }}
        onMarkAsPaid={() => {
          /* No mark as paid action here */
        }}
        onMarkAsUnpaid={async () => {
          /* No mark as unpaid action here */
        }}
      />

      {/* Placeholder for Received Invoices Table */}
      <h4 className="text-lg font-semibold mt-6 mb-2">Přijaté faktury</h4>

      <ReceivedInvoiceTable invoices={receivedInvoices} />

      <div className="flex m-2 mt-5 justify-end">
        <Button
          disabled={
            receivedInvoices.length === 0 && issuedInvoices.length === 0
          }
          onClick={handleDownloadXML}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          XML Kontrolní hlášení
        </Button>
      </div>
    </>
  )
}
