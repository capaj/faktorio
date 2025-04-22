import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { trpcClient } from '@/lib/trpcClient'
import { AlertCircleIcon, DownloadIcon } from 'lucide-react'
import { IssuedInvoiceTable } from '@/components/IssuedInvoiceTable'
import { ReceivedInvoiceTable } from '@/components/ReceivedInvoiceTable'
import {
  generateKontrolniHlaseniXML,
  type SubmitterData
} from '@/lib/generateKontrolniHlaseniXML'
import { generateDanovePriznaniXML } from '@/lib/generateDanovePriznaniXML'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { formatCzechDate } from '@/lib/utils'

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

// Helper function to get date range for a month
function getMonthlyDateRange(
  year: number,
  month: number // 1-12
): { startDate: string; endDate: string } {
  const startDate = new Date(year, month - 1, 1) // Month is 0-indexed
  const endDate = new Date(year, month, 0) // Day 0 of next month is last day of current month

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

// Helper to get month names for the selector
const getMonthNames = (locale = 'cs-CZ') => {
  return [...Array(12)].map((_, i) => {
    const date = new Date(2000, i, 1) // Use a fixed year/day
    return date.toLocaleString(locale, { month: 'long' })
  })
}
const czechMonthNames = getMonthNames()

export function XMLExportPage() {
  const { year: initialYear, quarter: initialQuarter } = getLastEndedQuarter()
  const [selectedYear, setSelectedYear] = useState<number>(initialYear)
  const [selectedQuarter, setSelectedQuarter] = useState<number>(initialQuarter)
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1 // Default to current month
  )
  const [cadence, setCadence] = useState<'quarterly' | 'monthly'>('quarterly')
  const [isAcknowledgementChecked, setIsAcknowledgementChecked] =
    useState(false)

  const { startDate, endDate } =
    cadence === 'quarterly'
      ? getQuarterDateRange(selectedYear, selectedQuarter)
      : getMonthlyDateRange(selectedYear, selectedMonth)

  // Fetch issued invoices for the selected period
  const [issuedInvoicesWithVat] =
    trpcClient.invoices.listInvoices.useSuspenseQuery({
      from: startDate,
      to: endDate,
      vat: {
        minimum: 1
      }
    })

  const [eurInvoices] = trpcClient.invoices.listInvoices.useSuspenseQuery({
    from: startDate,
    to: endDate,
    currency: 'EUR',
    vat: {
      maximum: 0 // only include reverse charge invoices for now
    }
  })

  // Fetch received invoices for the selected period
  const [receivedInvoices] = trpcClient.receivedInvoices.list.useSuspenseQuery({
    from: startDate,
    to: endDate
  })

  // Fetch submitter data
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()

  const [firstName, lastName] = (invoicingDetails?.name ?? '').split(' ')

  if (!invoicingDetails?.vat_no) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-bold">
          Není nastaveno žádné daňové identifikační číslo.
        </div>
      </div>
    )
  }

  const submitterData: SubmitterData = {
    dic: invoicingDetails.vat_no,
    typ_ds: 'F',
    jmeno: firstName,
    prijmeni: lastName,
    ulice: invoicingDetails.street ?? '',
    psc: invoicingDetails?.zip ?? '',
    stat: invoicingDetails?.country ?? 'ČESKÁ REPUBLIKA',
    email: invoicingDetails?.main_email ?? ''
  }

  const handleDownloadXML = () => {
    const xmlString = generateKontrolniHlaseniXML({
      issuedInvoices: issuedInvoicesWithVat,
      receivedInvoices,
      submitterData,
      year: selectedYear,

      quarter: cadence === 'quarterly' ? selectedQuarter : undefined,
      month: cadence === 'monthly' ? selectedMonth : undefined
    })

    // Trigger Download
    const periodString =
      cadence === 'quarterly' ? `Q${selectedQuarter}` : `M${selectedMonth}`
    const blob = new Blob([xmlString], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KH_${selectedYear}_${periodString}_${submitterData.dic}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadDanovePriznaniXML = () => {
    const xmlString = generateDanovePriznaniXML({
      issuedInvoices: issuedInvoicesWithVat,
      receivedInvoices,
      submitterData,
      year: selectedYear,
      eurInvoiceSum: eurInvoices.reduce(
        (sum, inv) => sum + (inv.native_total ?? 0),
        0
      ),
      quarter: cadence === 'quarterly' ? selectedQuarter : undefined,
      month: cadence === 'monthly' ? selectedMonth : undefined
    })

    // Trigger Download
    const periodString =
      cadence === 'quarterly' ? `Q${selectedQuarter}` : `M${selectedMonth}`
    const blob = new Blob([xmlString], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DPHDP3_${selectedYear}_${periodString}_${submitterData.dic}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const currentDisplayYear = new Date().getFullYear()

  return (
    <>
      <div className="flex items-center justify-between m-4 flex-wrap gap-2">
        <h3 className="font-semibold md:block">Export XML pro finanční úřad</h3>
        <div className="flex items-center space-x-2 flex-wrap">
          <Select
            value={cadence}
            onValueChange={(value: 'quarterly' | 'monthly') => {
              setCadence(value)
              // Optional: Reset month/quarter when cadence changes?
              // if (value === 'quarterly') {
              //   setSelectedQuarter(initialQuarter); // Or keep last selected?
              // } else {
              //   setSelectedMonth(new Date().getMonth() + 1); // Or keep last selected?
              // }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Periodicita" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Čtvrtletně</SelectItem>
              <SelectItem value="monthly">Měsíčně</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => {
              setSelectedYear(parseInt(value))
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

          {cadence === 'quarterly' ? (
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
          ) : (
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => {
                setSelectedMonth(parseInt(value))
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Měsíc" />
              </SelectTrigger>
              <SelectContent>
                {czechMonthNames.map((monthName, index) => {
                  const monthValue = index + 1
                  return (
                    <SelectItem key={monthValue} value={monthValue.toString()}>
                      {monthName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}

          <span className="text-md text-muted-foreground">
            {formatCzechDate(startDate)} - {formatCzechDate(endDate)}
          </span>
        </div>
      </div>

      {/* Display Issued Invoices */}
      <h4 className="text-lg font-semibold mt-4 mb-2">Vydané faktury</h4>
      <IssuedInvoiceTable
        invoices={issuedInvoicesWithVat}
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

      {/* XML Download Section with Alert and Checkbox */}
      <div className="m-4 mt-6 space-y-4">
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Upozornění!</AlertTitle>
          <AlertDescription>
            Tato funkce je experimentální. Vygenerované XML může obsahovat chyby
            a nemusí být kompletní. Vždy si jej před odesláním zkontrolujte.
          </AlertDescription>
        </Alert>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="acknowledgement"
            checked={isAcknowledgementChecked}
            onCheckedChange={(checked) =>
              setIsAcknowledgementChecked(checked === true)
            }
          />
          <Label htmlFor="acknowledgement" className="text-sm font-medium">
            Beru na vědomí, že tato funkce je experimentální
          </Label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            disabled={
              (receivedInvoices.length === 0 &&
                issuedInvoicesWithVat.length === 0) ||
              !isAcknowledgementChecked
            }
            onClick={handleDownloadXML}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            XML Kontrolní hlášení
          </Button>
          <Button
            disabled={
              (receivedInvoices.length === 0 &&
                issuedInvoicesWithVat.length === 0) ||
              !isAcknowledgementChecked
            }
            onClick={handleDownloadDanovePriznaniXML}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            XML Daňové přiznání
          </Button>
        </div>
      </div>
    </>
  )
}
