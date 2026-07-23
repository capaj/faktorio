import { Invoice } from '@/components/IssuedInvoiceTable'
import { ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { formatCzechDate, toInt } from './utils'

export interface SubmitterData {
  dic: string
  typ_ds: string // 'F' for Fyzicka osoba, 'P' for Pravnicka osoba
  jmeno: string
  prijmeni: string
  // Fields for Pravnicka osoba (optional)
  nazev_prav_osoby?: string
  // Address fields (common)
  naz_obce: string // Required for SHV
  ulice: string
  c_pop?: string // House number - Popisné (Optional, might be part of ulice)
  c_orient?: string // House number - Orientační (Optional)
  psc: string
  stat: string
  // Contact fields (common)
  email: string
  telefon?: string // Optional
  // Fields for EPO identification (required for SHV)

  // Add other fields if needed from the query
}

interface GenerateXmlParams {
  issuedInvoices: Invoice[]
  receivedInvoices: ReceivedInvoice[]
  submitterData: SubmitterData
  year: number
  quarter?: number
  month?: number
}

// vat_base_21 / vat_21 are stored in the invoice's original currency, so they
// must be converted to CZK with exchange_rate. When the breakdown is missing
// (legacy invoice), fall back to the full subtotal/vat — assumes the whole
// invoice is at 21%, which is the best approximation pre-breakdown.
function getCzkBase21Issued(invoice: Invoice): number {
  if (invoice.vat_base_21 !== null && invoice.vat_base_21 !== undefined) {
    return invoice.vat_base_21 * (invoice.exchange_rate ?? 1)
  }
  return invoice.native_subtotal ?? 0
}

function getCzkVat21Issued(invoice: Invoice): number {
  if (invoice.vat_21 !== null && invoice.vat_21 !== undefined) {
    return invoice.vat_21 * (invoice.exchange_rate ?? 1)
  }
  return (invoice.native_total ?? 0) - (invoice.native_subtotal ?? 0)
}

function getCzkBaseReducedIssued(invoice: Invoice): number {
  const exchangeRate = invoice.exchange_rate ?? 1
  return (
    ((invoice.vat_base_12 ?? 0) + (invoice.vat_base_15 ?? 0)) * exchangeRate
  )
}

function getCzkVatReducedIssued(invoice: Invoice): number {
  const exchangeRate = invoice.exchange_rate ?? 1
  return ((invoice.vat_12 ?? 0) + (invoice.vat_15 ?? 0)) * exchangeRate
}

function getCzkBaseSecondReducedIssued(invoice: Invoice): number {
  return (invoice.vat_base_10 ?? 0) * (invoice.exchange_rate ?? 1)
}

function getCzkVatSecondReducedIssued(invoice: Invoice): number {
  return (invoice.vat_10 ?? 0) * (invoice.exchange_rate ?? 1)
}

function getCzkDocumentTotalIssued(invoice: Invoice): number {
  return (
    invoice.native_total ??
    invoice.total * (invoice.exchange_rate ?? 1)
  )
}

function getCzkBase21Received(invoice: ReceivedInvoice): number {
  const exchangeRate = invoice.exchange_rate ?? 1
  if (invoice.vat_base_21 !== null && invoice.vat_base_21 !== undefined) {
    return invoice.vat_base_21 * exchangeRate
  }
  return (invoice.total_without_vat ?? 0) * exchangeRate
}

function getCzkVat21Received(invoice: ReceivedInvoice): number {
  const exchangeRate = invoice.exchange_rate ?? 1
  if (invoice.vat_21 !== null && invoice.vat_21 !== undefined) {
    return invoice.vat_21 * exchangeRate
  }
  return ((invoice.total_with_vat ?? 0) - (invoice.total_without_vat ?? 0)) * exchangeRate
}

export function generateKontrolniHlaseniXML({
  issuedInvoices,
  receivedInvoices,
  submitterData,
  year,
  quarter,
  month
}: GenerateXmlParams): string {
  const VAT_THRESHOLD = 10000 // CZK threshold for B2/B3 split
  const todayCzech = formatCzechDate(new Date())

  // Process Issued Invoices (VetaA1 for reverse charge, VetaA4 for regular)
  let vetaA1Xml = ''
  let vetaA4Xml = ''
  let a5Base21 = 0
  let a5Vat21 = 0
  let a5BaseReduced = 0
  let a5VatReduced = 0
  let a5BaseSecondReduced = 0
  let a5VatSecondReduced = 0
  let a5InvoiceCount = 0
  let issuedInvoiceSubtotalSum = 0
  let a1Index = 0
  let a4Index = 0

  issuedInvoices.forEach((inv) => {
    const clientVatId = inv.client_vat_no
    const domesticCustomerTaxId = clientVatId?.startsWith('CZ')
      ? clientVatId.slice(2)
      : null
    const taxableDate = formatCzechDate(inv.taxable_fulfillment_due)
    const subtotalAmount = inv.native_subtotal ?? 0
    const totalAmount = inv.native_total ?? 0
    const vatAmount = totalAmount - subtotalAmount
    const base21Czk = getCzkBase21Issued(inv)
    const vat21Czk = getCzkVat21Issued(inv)
    const baseReducedCzk = getCzkBaseReducedIssued(inv)
    const vatReducedCzk = getCzkVatReducedIssued(inv)
    const baseSecondReducedCzk = getCzkBaseSecondReducedIssued(inv)
    const vatSecondReducedCzk = getCzkVatSecondReducedIssued(inv)
    issuedInvoiceSubtotalSum += base21Czk

    // Check if this is a reverse charge invoice (no VAT charged)
    // This happens when subtotal equals total (vatAmount is 0)
    // and both client and supplier are Czech (CZ VAT IDs)
    const isReverseCharge =
      vatAmount === 0 &&
      domesticCustomerTaxId !== null &&
      submitterData.dic.startsWith('CZ')

    if (isReverseCharge) {
      a1Index++
      vetaA1Xml += `
    <VetaA1
      c_radku="${a1Index}"
      dic_odb="${domesticCustomerTaxId}"
      c_evid_dd="${inv.number}"
      duzp="${taxableDate}"
      zakl_dane1="${toInt(subtotalAmount)}"
    />`
      return
    }

    // A.4 is itemized only when the rounded absolute document total is above
    // CZK 10,000 and the customer supplied a domestic tax ID. All other
    // regular taxable supplies are aggregated in A.5.
    const documentTotalCzk = Math.abs(
      Math.round(getCzkDocumentTotalIssued(inv))
    )
    const shouldReportInA4 =
      domesticCustomerTaxId !== null && documentTotalCzk > VAT_THRESHOLD

    if (shouldReportInA4) {
      a4Index++
      vetaA4Xml += `
    <VetaA4
      c_radku="${a4Index}"
      dic_odb="${domesticCustomerTaxId}"
      c_evid_dd="${inv.number}"
      dppd="${taxableDate}"
      zakl_dane1="${toInt(base21Czk)}"
      dan1="${toInt(vat21Czk)}"
      zakl_dane2="${toInt(baseReducedCzk)}"
      dan2="${toInt(vatReducedCzk)}"
      zakl_dane3="${toInt(baseSecondReducedCzk)}"
      dan3="${toInt(vatSecondReducedCzk)}"
      kod_rezim_pl="0"
      zdph_44="N"
    />`
      return
    }

    a5InvoiceCount++
    a5Base21 += base21Czk
    a5Vat21 += vat21Czk
    a5BaseReduced += baseReducedCzk
    a5VatReduced += vatReducedCzk
    a5BaseSecondReduced += baseSecondReducedCzk
    a5VatSecondReduced += vatSecondReducedCzk
  })

  const vetaA5Xml =
    a5InvoiceCount > 0
      ? `
    <VetaA5
      zakl_dane1="${toInt(a5Base21)}"
      dan1="${toInt(a5Vat21)}"
      zakl_dane2="${toInt(a5BaseReduced)}"
      dan2="${toInt(a5VatReduced)}"
      zakl_dane3="${toInt(a5BaseSecondReduced)}"
      dan3="${toInt(a5VatSecondReduced)}"
    />`
      : ''

  // Process Received Invoices (VetaB2 and VetaB3)
  let vetaB2Xml = ''
  let b3TotalSubtotal = 0
  let b3TotalVat = 0
  let receivedInvoiceSubtotalSum = 0
  let b2Index = 0

  receivedInvoices.forEach((inv) => {
    const supplierVatId = inv.supplier_vat_no || 'MISSING_DIC_DOD'
    const taxableSupplyDate = inv.taxable_supply_date || inv.issue_date
    const taxableDate = formatCzechDate(taxableSupplyDate)
    const totalWithVat = inv.total_with_vat ?? 0
    const base21Czk = getCzkBase21Received(inv)
    const vat21Czk = getCzkVat21Received(inv)
    receivedInvoiceSubtotalSum += base21Czk

    if (
      !inv.invoice_number ||
      !taxableSupplyDate ||
      !supplierVatId ||
      supplierVatId === 'MISSING_DIC_DOD'
    ) {
      console.warn(
        'Skipping received invoice due to missing data (invoice_number, taxableDate, supplierVatId):',
        inv
      )
      return
    }

    const sanitizedSupplierVatId = supplierVatId.startsWith('CZ')
      ? supplierVatId.replace('CZ', '')
      : supplierVatId

    const shouldReportInB2 =
      inv.currency === 'CZK' && Math.abs(totalWithVat) > VAT_THRESHOLD

    if (shouldReportInB2) {
      b2Index++
      vetaB2Xml += `
    <VetaB2
      c_radku="${b2Index}"
      dic_dod="${sanitizedSupplierVatId}"
      c_evid_dd="${inv.invoice_number}"
      dppd="${taxableDate}"
      zakl_dane1="${toInt(base21Czk)}"
      dan1="${toInt(vat21Czk)}"
      zdph_44="N"
      pomer="N"
    />`
    } else {
      b3TotalSubtotal += base21Czk
      b3TotalVat += vat21Czk
    }
  })

  const vetaB3Xml = `
    <VetaB3
      zakl_dane1="${toInt(b3TotalSubtotal)}"
      dan1="${toInt(b3TotalVat)}"
    />`

  // Construct Final XML
  let periodAttribute = ''
  if (quarter !== undefined) {
    periodAttribute = `ctvrt="${quarter}"`
  } else if (month !== undefined) {
    const formattedMonth = month.toString()
    periodAttribute = `mesic="${formattedMonth}"`
  } else {
    throw new Error(
      'Either month or quarter must be provided for XML generation.'
    )
  }

  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="EPO MF ČR" verzeSW="41.16.3">
<DPHKH1 verzePis="03.01">
  <VetaD k_uladis="DPH" dokument="KH1"
    rok="${year}" ${periodAttribute}
    d_poddp="${todayCzech}"
    khdph_forma="B"
  />
  <VetaP
    dic="${submitterData.dic.replace('CZ', '')}" typ_ds="${submitterData.typ_ds}" jmeno="${submitterData.jmeno}" prijmeni="${submitterData.prijmeni}" ulice="${submitterData.ulice}" psc="${submitterData.psc}" stat="${submitterData.stat}" email="${submitterData.email}" sest_jmeno="${submitterData.jmeno}" sest_prijmeni="${submitterData.prijmeni}"
  />
  ${vetaA1Xml}
  ${vetaA4Xml}${vetaA5Xml}
  ${vetaB2Xml}
  ${vetaB3Xml}
  <VetaC
    obrat23="${toInt(issuedInvoiceSubtotalSum)}"
    pln23="${toInt(receivedInvoiceSubtotalSum)}"
  />
</DPHKH1>
</Pisemnost>`

  return xmlString
}
