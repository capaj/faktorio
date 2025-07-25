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

  // Calculate sums for <Veta1>
  let obrat23 = 0
  let dan23 = 0
  issuedInvoices.forEach((inv) => {
    const subtotal = inv.native_subtotal ?? 0
    const vatAmount = (inv.native_total ?? 0) - subtotal
    obrat23 += subtotal
    dan23 += vatAmount
  })

  // Calculate sums for <Veta4>
  let pln23 = 0
  let odp_tuz23_nar = 0
  receivedInvoices.forEach((inv) => {
    const subtotal = inv.total_without_vat ?? 0
    const totalWithVat = inv.total_with_vat ?? 0
    const vatAmount = totalWithVat - subtotal
    pln23 += subtotal
    odp_tuz23_nar += vatAmount
  })
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
