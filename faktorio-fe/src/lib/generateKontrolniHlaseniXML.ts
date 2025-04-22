import { Invoice } from '@/components/IssuedInvoiceTable'
import { ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { formatCzechDate, formatXmlNumber } from './utils'

export interface SubmitterData {
  dic: string
  typ_ds: string
  jmeno: string
  prijmeni: string
  ulice: string
  psc: string
  stat: string
  email: string
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

  // Process Issued Invoices (VetaA4)
  let vetaA4Xml = ''
  let issuedInvoiceSubtotalSum = 0
  issuedInvoices.forEach((inv, index) => {
    const clientVatId = inv.client_vat_no || 'MISSING_DIC_ODB'
    const taxableDate = formatCzechDate(inv.taxable_fulfillment_due)
    const subtotal = inv.subtotal ?? 0
    const vatAmount = (inv.total ?? 0) - subtotal
    issuedInvoiceSubtotalSum += subtotal

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

    vetaA4Xml += `
    <VetaA4
      c_radku="${index + 1}"
      dic_odb="${clientVatId.replace('CZ', '')}"
      c_evid_dd="${inv.number}"
      dppd="${taxableDate}"
      zakl_dane1="${formatXmlNumber(subtotal)}"
      dan1="${formatXmlNumber(vatAmount)}"
      kod_rezim_pl="0"
      zdph_44="N"
    />`
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
      zakl_dane1="${formatXmlNumber(subtotal)}"
      dan1="${formatXmlNumber(vatAmount)}"
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
      zakl_dane1="${formatXmlNumber(b3TotalSubtotal)}"
      dan1="${formatXmlNumber(b3TotalVat)}"
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
  ${vetaA4Xml}
  ${vetaB2Xml}
  ${vetaB3Xml}
  <VetaC
    obrat23="${formatXmlNumber(issuedInvoiceSubtotalSum)}"
    pln23="${formatXmlNumber(receivedInvoiceSubtotalSum)}"
  />
</DPHKH1>
</Pisemnost>`

  return xmlString
}
