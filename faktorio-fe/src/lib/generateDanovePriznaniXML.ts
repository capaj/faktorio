import { Invoice } from '@/components/IssuedInvoiceTable'
import { ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { SubmitterData } from './generateKontrolniHlaseniXML'
import { formatCzechDate, toInt } from './utils'

interface GenerateDanovePriznaniParams {
  issuedInvoices: Invoice[]
  receivedInvoices: ReceivedInvoice[]
  czkSumEurServices: number
  czkSumOutsideEuServices?: number
  submitterData: SubmitterData
  year: number
  quarter?: number
  month?: number
}

type VatBreakdown = Pick<
  Invoice,
  | 'vat_base_21'
  | 'vat_21'
  | 'vat_base_12'
  | 'vat_12'
  | 'vat_base_15'
  | 'vat_15'
  | 'vat_base_10'
  | 'vat_10'
>

interface VatTotals {
  base21: number
  vat21: number
  baseReduced: number
  vatReduced: number
}

// Keep converted document amounts in integer haléře until each return row is
// rounded. Negative credit notes use the same rounding as positive invoices.
function toHalers(amount: number): number {
  return (
    Math.sign(amount) * Math.round((Math.abs(amount) + Number.EPSILON) * 100)
  )
}

function toWholeCzk(halers: number): number {
  return Math.sign(halers) * Math.round(Math.abs(halers) / 100)
}

function getVatTotals(
  invoice: VatBreakdown,
  exchangeRate: number,
  legacyBaseCzk: number,
  legacyVatCzk: number
): VatTotals {
  const hasBreakdown = [
    invoice.vat_base_21,
    invoice.vat_21,
    invoice.vat_base_12,
    invoice.vat_12,
    invoice.vat_base_15,
    invoice.vat_15,
    invoice.vat_base_10,
    invoice.vat_10
  ].some((amount) => amount !== null && amount !== undefined)

  if (!hasBreakdown) {
    // Pre-breakdown documents retain the existing 21% classification, using
    // their recorded VAT (total minus base), never VAT recomputed from a rate.
    // Documents without VAT do not belong in the taxable/deductible rows.
    return {
      base21: legacyVatCzk === 0 ? 0 : toHalers(legacyBaseCzk),
      vat21: toHalers(legacyVatCzk),
      baseReduced: 0,
      vatReduced: 0
    }
  }

  // Explicit zeroes are authoritative. A reduced-rate-only document must not
  // fall back to its full subtotal for the 21% row. Historical reduced rates
  // also belong in row 2/41, for example when reporting a credit note.
  return {
    base21: toHalers((invoice.vat_base_21 ?? 0) * exchangeRate),
    vat21: toHalers((invoice.vat_21 ?? 0) * exchangeRate),
    baseReduced: toHalers(
      ((invoice.vat_base_12 ?? 0) +
        (invoice.vat_base_15 ?? 0) +
        (invoice.vat_base_10 ?? 0)) *
        exchangeRate
    ),
    vatReduced: toHalers(
      ((invoice.vat_12 ?? 0) + (invoice.vat_15 ?? 0) + (invoice.vat_10 ?? 0)) *
        exchangeRate
    )
  }
}

function sumVatTotals(documents: VatTotals[]): VatTotals {
  const totals = documents.reduce(
    (sum, document) => ({
      base21: sum.base21 + document.base21,
      vat21: sum.vat21 + document.vat21,
      baseReduced: sum.baseReduced + document.baseReduced,
      vatReduced: sum.vatReduced + document.vatReduced
    }),
    { base21: 0, vat21: 0, baseReduced: 0, vatReduced: 0 }
  )

  return {
    base21: toWholeCzk(totals.base21),
    vat21: toWholeCzk(totals.vat21),
    baseReduced: toWholeCzk(totals.baseReduced),
    vatReduced: toWholeCzk(totals.vatReduced)
  }
}

function getIssuedVatTotals(invoice: Invoice): VatTotals {
  const exchangeRate = invoice.exchange_rate ?? 1
  const baseCzk = invoice.native_subtotal ?? 0
  const totalCzk = invoice.native_total ?? invoice.total * exchangeRate
  return getVatTotals(invoice, exchangeRate, baseCzk, totalCzk - baseCzk)
}

export function hasIssuedVatAmounts(invoice: Invoice): boolean {
  return Object.values(getIssuedVatTotals(invoice)).some(
    (amount) => amount !== 0
  )
}

export function generateDanovePriznaniXML({
  issuedInvoices,
  receivedInvoices,
  czkSumEurServices,
  czkSumOutsideEuServices = 0,
  submitterData,
  year,
  quarter,
  month
}: GenerateDanovePriznaniParams): string {
  const todayCzech = formatCzechDate(new Date())

  const issued = sumVatTotals(issuedInvoices.map(getIssuedVatTotals))
  const received = sumVatTotals(
    receivedInvoices.map((invoice) => {
      const exchangeRate = invoice.exchange_rate ?? 1
      const base = invoice.total_without_vat ?? 0
      return getVatTotals(
        invoice,
        exchangeRate,
        base * exchangeRate,
        (invoice.total_with_vat - base) * exchangeRate
      )
    })
  )

  const obrat23 = issued.base21
  const dan23 = issued.vat21
  const obrat5 = issued.baseReduced
  const dan5 = issued.vatReduced
  const pln23 = received.base21
  const odp_tuz23_nar = received.vat21
  const pln5 = received.baseReduced
  const odp_tuz5_nar = received.vatReduced

  // Summary rows are sums/differences of the rounded rows actually exported.
  const odp_sum_nar = odp_tuz23_nar + odp_tuz5_nar
  const dan_zocelk = dan23 + dan5
  const odp_zocelk = odp_sum_nar
  const dano_da = Math.max(0, dan_zocelk - odp_zocelk)
  const dano_no = Math.max(0, odp_zocelk - dan_zocelk)

  // Construct Final XML

  // Determine period attribute based on provided month or quarter
  let periodAttribute = ''
  if (quarter !== undefined) {
    periodAttribute = `ctvrt="${quarter}"`
  } else if (month !== undefined) {
    // Ensure month is formatted correctly if needed (e.g., leading zero)
    // Assuming month is 1-12, the XML spec might require 01-12
    const formattedMonth = month.toString() // Adjust if specific formatting is needed
    periodAttribute = `mesic="${formattedMonth}"`
  } else {
    // Handle error: Neither month nor quarter provided
    throw new Error(
      'Either month or quarter must be provided for XML generation.'
    )
  }

  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="EPO MF ČR" verzeSW="41.6.1">
<DPHDP3 verzePis="01.02">
  <VetaD
    k_uladis="DPH"
    dokument="DP3"
    rok="${year}" ${periodAttribute}
    d_poddp="${todayCzech}"
    dapdph_forma="B"
    trans="A"
    typ_platce="P"
  />
  <VetaP
    dic="${submitterData.dic.replace('CZ', '')}" typ_ds="${submitterData.typ_ds}" jmeno="${submitterData.jmeno}" prijmeni="${submitterData.prijmeni}" ulice="${submitterData.ulice}" psc="${submitterData.psc}" stat="${submitterData.stat}" email="${submitterData.email}" sest_jmeno="${submitterData.jmeno}" sest_prijmeni="${submitterData.prijmeni}"
  />
  <Veta1
    obrat23="${toInt(obrat23)}" dan23="${toInt(dan23)}"
    obrat5="${toInt(obrat5)}" dan5="${toInt(dan5)}"
  />
  ${
    czkSumEurServices > 0 || czkSumOutsideEuServices > 0
      ? `<Veta2${czkSumEurServices > 0 ? ` pln_sluzby="${toInt(czkSumEurServices)}"` : ''}${czkSumOutsideEuServices > 0 ? ` pln_ost="${toInt(czkSumOutsideEuServices)}"` : ''} />`
      : ''
  }
  <Veta4
    pln23="${toInt(pln23)}" odp_tuz23_nar="${toInt(odp_tuz23_nar)}"
    pln5="${toInt(pln5)}" odp_tuz5_nar="${toInt(odp_tuz5_nar)}"
    odp_sum_nar="${toInt(odp_sum_nar)}"
  />
  <Veta6
    dan_zocelk="${toInt(dan_zocelk)}" odp_zocelk="${toInt(odp_zocelk)}" ${dano_no > 0 ? `dano_no="${toInt(dano_no)}"` : `dano_da="${toInt(dano_da)}"`}
  />
</DPHDP3>
</Pisemnost>`

  return xmlString
}
