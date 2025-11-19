import { useMemo, useState } from 'react'
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
import {
  ReceivedInvoiceTable,
  type ReceivedInvoice
} from '@/components/ReceivedInvoiceTable'
import {
  generateKontrolniHlaseniXML,
  type SubmitterData
} from '@/lib/generateKontrolniHlaseniXML'
import { generateDanovePriznaniXML } from '@/lib/generateDanovePriznaniXML'
import { generateSouhrnneHlaseniXML } from '@/lib/generateSouhrnneHlaseniXML'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCzechDate } from '@/lib/utils'

// EU country codes
const EU_COUNTRY_CODES = [
  'AT',
  'BE',
  'BG',
  'CZ',
  'HR',
  'CY',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE'
]

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

  // Fetch reverse charge invoices (VAT = 0) to filter for EU invoices
  const [invoicesWithoutVat] =
    trpcClient.invoices.listInvoices.useSuspenseQuery({
      from: startDate,
      to: endDate,
      vat: {
        maximum: 0
      }
    })

  // Filter reverse charge invoices to only include EU countries based on VAT ID prefix
  const reverseChargeAbroadInvoices = invoicesWithoutVat.filter(
    (invoice: { client_vat_no?: string | null }) => {
      if (!invoice.client_vat_no || invoice.client_vat_no.length < 2)
        return false
      const countryCode = invoice.client_vat_no.substring(0, 2).toUpperCase()
      return EU_COUNTRY_CODES.includes(countryCode) && countryCode !== 'CZ'
    }
  )

  // Fetch received invoices for the selected period
  const [receivedInvoices] = trpcClient.receivedInvoices.list.useSuspenseQuery({
    from: startDate,
    to: endDate
  })

  const { regularReceivedInvoices, receivedCreditNotes } = useMemo(() => {
    const creditNotes: ReceivedInvoice[] = []
    const regular: ReceivedInvoice[] = []

    receivedInvoices.forEach((invoice) => {
      const subtotal = invoice.total_without_vat ?? 0
      const totalWithVat = invoice.total_with_vat ?? 0

      if (subtotal < 0 || totalWithVat < 0) {
        creditNotes.push(invoice)
      } else {
        regular.push(invoice)
      }
    })

    return {
      regularReceivedInvoices: regular,
      receivedCreditNotes: creditNotes
    }
  }, [receivedInvoices])

  // Fetch submitter data
  const [invoicingDetails] = trpcClient.invoicingDetails.useSuspenseQuery()

  const [rawFirstName, ...rawLastNameParts] = (
    invoicingDetails?.name ?? ''
  ).split(' ')
  const submitterLastName = rawLastNameParts.join(' ') || rawFirstName // Handle single names

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
    typ_ds: 'F', // Assuming 'F' for Fyzická osoba, adjust if needed
    jmeno: rawFirstName,
    prijmeni: submitterLastName,
    naz_obce: invoicingDetails.city ?? '',
    ulice: invoicingDetails.street ?? '',
    psc: invoicingDetails?.zip ?? '',
    stat: invoicingDetails?.country ?? 'ČESKÁ REPUBLIKA',
    email: invoicingDetails?.main_email ?? '' // Not in SHV VetaP but part of type
  }

  const handleDownloadKHXML = () => {
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
      czkSumEurServices: reverseChargeAbroadInvoices.reduce(
        (sum: number, inv: { native_total?: number | null }) =>
          sum + (inv.native_total ?? 0),
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

  const handleDownloadSHVXML = () => {
    if (cadence !== 'quarterly') {
      alert('Souhrnné hlášení (SHV) lze generovat pouze pro čtvrtletní období.')
      return
    }

    if (reverseChargeAbroadInvoices.length === 0) {
      alert(
        'Nebyly nalezeny žádné relevantní EUR faktury pro generování Souhrnného hlášení.'
      )
      return
    }

    try {
      // Filter is simplified as generator now handles VAT ID parsing and validation
      const relevantInvoices = reverseChargeAbroadInvoices.filter(
        (inv: {
          client_vat_no?: string | null
          native_total?: number | null
        }) =>
          inv.client_vat_no && // Just check if VAT no exists
          inv.native_total != null
      )

      const xmlString = generateSouhrnneHlaseniXML({
        issuedInvoices: relevantInvoices, // Pass the filtered list
        submitterData,
        year: selectedYear,
        quarter: selectedQuarter
      })

      // Trigger Download
      const periodString = `Q${selectedQuarter}`
      const blob = new Blob([xmlString], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SHV_${selectedYear}_${periodString}_${submitterData.dic}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating SHV XML:', error)
      alert(`Chyba při generování SHV XML: ${(error as Error).message}`)
    }
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
      <h4 className="text-lg font-semibold mt-4 mb-2">
        Tuzemské faktury s DPH
      </h4>
      <IssuedInvoiceTable invoices={issuedInvoicesWithVat} isLoading={false} />

      {reverseChargeAbroadInvoices.length > 0 && (
        <div className="my-4">
          <h4 className="text-lg font-semibold mt-4 mb-2">
            Reverse charge faktury mezinárodní v rámci EU
          </h4>
          <IssuedInvoiceTable
            invoices={reverseChargeAbroadInvoices}
            isLoading={false}
          />

          <p className="text-sm text-muted-foreground mt-1">
            EU faktury jsou identifikovány podle prvních 2 písmen DIČ odběratele
            (např. DE123456789 pro Německo) a zahrnují pouze faktury s
            přenesenou daňovou povinností (reverse charge) do zemí EU. Pro účely
            exportu předpokládáme, že se jedná o "Poskytnutí služeb s místem
            plnění v jiném členském státě vymezených v § 102 odst. 1 písm. d) a
            odst. 3 písm a)" tedy řádek 21 v daňovém přiznání.
          </p>
        </div>
      )}

      {/* Placeholder for Received Invoices Table */}
      <h4 className="text-lg font-semibold mt-6 mb-2">Přijaté faktury</h4>

      <ReceivedInvoiceTable invoices={regularReceivedInvoices} />

      {receivedCreditNotes.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2">
            Dobropisy (opravné daňové doklady)
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Dobropisy jsou započítány se zápornými částkami a v kontrolním
            hlášení sníží nárok na odpočet DPH v období, kdy byly obdrženy.
          </p>
          <ReceivedInvoiceTable invoices={receivedCreditNotes} />
        </div>
      )}

      {/* XML Download Section with Alert and Checkbox */}
      <div className="m-4 mt-6 space-y-4">
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Upozornění!</AlertTitle>
          <AlertDescription>
            Tato funkce je prozatím experimentální. Vygenerované XML může
            obsahovat chyby a nemusí být kompletní. Vždy si jej před odesláním
            zkontrolujte.
          </AlertDescription>
        </Alert>
        <div className="flex justify-end space-x-2 flex-wrap gap-y-2">
          <Button
            disabled={
              reverseChargeAbroadInvoices.length === 0 ||
              cadence !== 'quarterly'
            }
            onClick={handleDownloadSHVXML}
            title={
              cadence !== 'quarterly'
                ? 'SHV je pouze čtvrtletní'
                : reverseChargeAbroadInvoices.length === 0
                  ? 'Nejsou žádné EUR faktury pro SHV'
                  : undefined
            }
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            XML Souhrnné hlášení (SHV)
          </Button>
          <Button
            disabled={
              receivedInvoices.length === 0 &&
              issuedInvoicesWithVat.length === 0
            }
            onClick={handleDownloadKHXML}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            XML Kontrolní hlášení
          </Button>
          <Button
            disabled={
              receivedInvoices.length === 0 &&
              issuedInvoicesWithVat.length === 0
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
