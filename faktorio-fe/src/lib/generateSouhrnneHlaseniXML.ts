import { Invoice } from '@/components/IssuedInvoiceTable' // Keep for reference, but use actual fields
import { SubmitterData } from './generateKontrolniHlaseniXML'
import { formatCzechDate, toInt } from './utils'

interface GenerateSouhrnneHlaseniParams {
  // Use a more accurate type reflecting the tRPC response structure
  issuedInvoices: Array<{
    currency?: string | null
    client_vat_no?: string | null
    // client_country removed - derive from client_vat_no
    native_total?: number | null // Assuming this holds the CZK equivalent for EUR invoices
    // Include other fields if needed by filtering logic
  }>
  submitterData: SubmitterData
  year: number
  quarter: number // SHV is typically quarterly
}

interface VetaRData {
  k_stat: string
  c_vat: string
  pln_pocet: number
  pln_hodnota: number
}

export function generateSouhrnneHlaseniXML({
  issuedInvoices,
  submitterData,
  year,
  quarter
}: GenerateSouhrnneHlaseniParams): string {
  const todayCzech = formatCzechDate(new Date())

  // Filter EUR invoices to EU VAT payers (excluding domestic CZ) and aggregate data for VetaR
  const vetaRMap = new Map<string, VetaRData>()

  issuedInvoices.forEach((inv) => {
    // Derive country code from client_vat_no prefix
    if (
      inv.currency === 'EUR' &&
      inv.client_vat_no && // Check if VAT number exists
      inv.native_total != null
    ) {
      const countryCode = inv.client_vat_no.substring(0, 2).toUpperCase()
      const vatNumberWithoutPrefix = inv.client_vat_no.substring(2)

      // Basic validation: 2 letters, not CZ, and rest looks like a number/alphanum
      // More robust validation might be needed depending on VAT ID formats
      if (
        countryCode.length !== 2 ||
        !/^[A-Z]+$/.test(countryCode) || // Ensure it's letters
        countryCode === 'CZ' || // Exclude domestic
        vatNumberWithoutPrefix.length === 0 // Ensure there's something after prefix
      ) {
        console.warn(
          `Invalid EU VAT ID format or domestic CZ VAT ID for invoice: ${inv.client_vat_no}. Skipping SHV entry.`
        )
        return // Skip this invoice if VAT ID format looks wrong or is domestic
      }

      const key = `${countryCode}-${vatNumberWithoutPrefix}` // Use derived countryCode

      if (!vetaRMap.has(key)) {
        vetaRMap.set(key, {
          k_stat: countryCode, // Use derived countryCode
          c_vat: vatNumberWithoutPrefix, // Use VAT number without prefix
          pln_pocet: 0,
          pln_hodnota: 0
        })
      }

      const currentData = vetaRMap.get(key)!
      currentData.pln_pocet += 1
      // Use Math.floor to truncate decimals as seen in the example, using native_total
      currentData.pln_hodnota += Math.floor(inv.native_total)
      vetaRMap.set(key, currentData)
    }
  })

  const vetaRElements = Array.from(vetaRMap.values())
    .map(
      (data, index) =>
        `<VetaR por_c_stran="${index + 1}" c_rad="${index + 1}" k_stat="${data.k_stat}" c_vat="${data.c_vat}" k_pln_eu="3" pln_pocet="${data.pln_pocet}" pln_hodnota="${data.pln_hodnota}" />`
    )
    .join('\n')

  if (vetaRElements.length === 0) {
    throw new Error(
      'No relevant EUR invoices found for Souhrnné hlášení generation.'
    )
  }

  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="EPO MF ČR" verzeSW="45.5.1">
<DPHSHV verzePis="02.01">
<VetaD k_uladis="DPH" dokument="SHV" ctvrt="${quarter}" rok="${year}" shvies_forma="R" d_poddp="${todayCzech}" />
<VetaP dic="${submitterData.dic.replace('CZ', '')}" typ_ds="${submitterData.typ_ds}" ${submitterData.typ_ds === 'P' ? `nazev_prav_osoby="${submitterData.nazev_prav_osoby ?? ''}"` : `prijmeni="${submitterData.prijmeni}" jmeno="${submitterData.jmeno}"`} naz_obce="${submitterData.naz_obce}" ulice="${submitterData.ulice}" ${submitterData.c_pop ? `c_pop="${submitterData.c_pop}"` : ''} ${submitterData.c_orient ? `c_orient="${submitterData.c_orient}"` : ''} psc="${submitterData.psc}" stat="${submitterData.stat}" />
${vetaRElements}
</DPHSHV>
</Pisemnost>`

  return xmlString
}
