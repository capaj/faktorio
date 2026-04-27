import { Invoice } from '@/components/IssuedInvoiceTable'
import { ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { SubmitterData } from './generateKontrolniHlaseniXML'
import { formatCzechDate, toInt } from './utils'

interface GenerateDanovePriznaniParams {
  issuedInvoices: Invoice[]
  receivedInvoices: ReceivedInvoice[]
  czkSumEurServices: number
  submitterData: SubmitterData
  year: number
  quarter?: number
  month?: number
}

const VAT_RATE_21 = 0.21

/**
 * ADIS validates VAT amount against the tax base (rounded to whole CZK in XML).
 * To avoid cumulative floating point drift (or mixed per-invoice rounding),
 * we calculate VAT from the summed base in haléře and then convert back to CZK.
 */
function calculateVatFromBase(base: number, rate: number): number {
  const baseInHalers = Math.round(base * 100)
  const vatInHalers = Math.round(baseInHalers * rate)
  return vatInHalers / 100
}

// Per-invoice 21% base in CZK. vat_base_21 is stored in the invoice's original
// currency, so it must be converted via exchange_rate before summing. When the
// breakdown is missing (legacy invoice), fall back to native_subtotal (already
// CZK), which assumes the whole invoice is at 21% — the best available
// approximation for invoices written before the breakdown columns existed.
function getCzkBase21Issued(invoice: Invoice): number {
  if (invoice.vat_base_21 !== null && invoice.vat_base_21 !== undefined) {
    return invoice.vat_base_21 * (invoice.exchange_rate ?? 1)
  }
  return invoice.native_subtotal ?? 0
}

function getCzkBase21Received(invoice: ReceivedInvoice): number {
  const exchangeRate = invoice.exchange_rate ?? 1
  if (invoice.vat_base_21 !== null && invoice.vat_base_21 !== undefined) {
    return invoice.vat_base_21 * exchangeRate
  }
  return (invoice.total_without_vat ?? 0) * exchangeRate
}

export function generateDanovePriznaniXML({
  issuedInvoices,
  receivedInvoices,
  czkSumEurServices,
  submitterData,
  year,
  quarter,
  month
}: GenerateDanovePriznaniParams): string {
  const todayCzech = formatCzechDate(new Date())

  const obrat23 = issuedInvoices.reduce(
    (sum, inv) => sum + getCzkBase21Issued(inv),
    0
  )

  const dan23 = calculateVatFromBase(obrat23, VAT_RATE_21)

  const pln23 = receivedInvoices.reduce(
    (sum, inv) => sum + getCzkBase21Received(inv),
    0
  )

  const odp_tuz23_nar = calculateVatFromBase(pln23, VAT_RATE_21)
  const odp_sum_nar = odp_tuz23_nar // In this simplified case, they are the same

  // Calculate sums for <Veta6>
  const dan_zocelk = dan23
  const odp_zocelk = odp_tuz23_nar
  // Ensure dano_da is not negative, minimum is 0
  const dano_da = Math.max(0, dan_zocelk - odp_zocelk)

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
  />
  ${czkSumEurServices > 0 ? `<Veta2 pln_sluzby="${toInt(czkSumEurServices)}" />` : ''}
  <Veta4
    pln23="${toInt(pln23)}" odp_tuz23_nar="${toInt(odp_tuz23_nar)}"
    odp_sum_nar="${toInt(odp_sum_nar)}"
  />
  <Veta6
    dan_zocelk="${toInt(dan_zocelk)}" odp_zocelk="${toInt(odp_zocelk)}" dano_da="${toInt(dano_da)}"
  />
</DPHDP3>
</Pisemnost>`

  return xmlString
}
