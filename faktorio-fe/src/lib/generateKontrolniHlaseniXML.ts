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
  let issuedInvoiceSubtotalSum = 0
  let a1Index = 0
  let a4Index = 0

  issuedInvoices.forEach((inv) => {
    const clientVatId = inv.client_vat_no || 'MISSING_DIC_ODB'
    const taxableDate = formatCzechDate(inv.taxable_fulfillment_due)
    const subtotalAmount = inv.subtotal ?? 0
    const totalAmount = inv.total ?? 0
    const vatAmount = totalAmount - subtotalAmount
    issuedInvoiceSubtotalSum += subtotalAmount

    if (
      !inv.number ||
      !taxableDate ||
      !clientVatId ||
      clientVatId === 'MISSING_DIC_ODB'
    ) {
      console.warn(
        'Skipping issued invoice due to missing data (number, taxableDate, clientVatId):',
        inv
      )
      return
    }

    // Check if this is a reverse charge invoice (no VAT charged)
    // This happens when subtotal equals total (vatAmount is 0)
    // and both client and supplier are Czech (CZ VAT IDs)
    const isReverseCharge =
      vatAmount === 0 &&
      clientVatId.startsWith('CZ') &&
      submitterData.dic.startsWith('CZ')

    if (isReverseCharge) {
      a1Index++
      vetaA1Xml += `
    <VetaA1
      c_radku="${a1Index}"
      dic_odb="${clientVatId.replace('CZ', '')}"
      c_evid_dd="${inv.number}"
      duzp="${taxableDate}"
      zakl_dane1="${toInt(subtotalAmount)}"
    />`
    } else {
      a4Index++
      vetaA4Xml += `
    <VetaA4
      c_radku="${a4Index}"
      dic_odb="${clientVatId.replace('CZ', '')}"
      c_evid_dd="${inv.number}"
      dppd="${taxableDate}"
      zakl_dane1="${toInt(subtotalAmount)}"
      dan1="${toInt(vatAmount)}"
      kod_rezim_pl="0"
      zdph_44="N"
    />`
    }
  })

  // Process Received Invoices (VetaB2 and VetaB3)
  let vetaB2Xml = ''
  let b3TotalSubtotal = 0
  let b3TotalVat = 0
  let receivedInvoiceSubtotalSum = 0
  let b2Index = 0

  receivedInvoices.forEach((inv) => {
    const supplierVatId = inv.supplier_vat_no || 'MISSING_DIC_DOD'
    const taxableDate = formatCzechDate(inv.issue_date)
    const subtotal = inv.total_without_vat ?? 0
    const totalWithVat = inv.total_with_vat ?? 0
    const vatAmount = totalWithVat - subtotal
    receivedInvoiceSubtotalSum += subtotal

    if (
      !inv.invoice_number ||
      !taxableDate ||
      !supplierVatId ||
      supplierVatId === 'MISSING_DIC_DOD'
    ) {
      console.warn(
        'Skipping received invoice due to missing data (invoice_number, taxableDate, supplierVatId):',
        inv
      )
      return
    }

    if (totalWithVat > VAT_THRESHOLD && inv.currency === 'CZK') {
      b2Index++
      vetaB2Xml += `
    <VetaB2
      c_radku="${b2Index}"
      dic_dod="${supplierVatId.replace('CZ', '')}"
      c_evid_dd="${inv.invoice_number}"
      dppd="${taxableDate}"
      zakl_dane1="${toInt(subtotal)}"
      dan1="${toInt(vatAmount)}"
      zdph_44="N" 
      pomer="N"
    />`
    } else {
      b3TotalSubtotal += subtotal
      b3TotalVat += vatAmount
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
  ${vetaA4Xml}
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
