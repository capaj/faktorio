type InvoiceDestinationFields = {
  client_country: string | null
  client_vat_no: string | null
}

export type InvoiceDestination = 'domestic' | 'eu' | 'outside-eu' | 'unknown'

const EU_VAT_PREFIXES = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'ES',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK'
])

const EU_COUNTRY_ALIASES = new Set(
  [
    'AT',
    'Austria',
    'Rakousko',
    'BE',
    'Belgium',
    'Belgie',
    'BG',
    'Bulgaria',
    'Bulharsko',
    'CY',
    'Cyprus',
    'Kypr',
    'DE',
    'Germany',
    'Německo',
    'DK',
    'Denmark',
    'Dánsko',
    'EE',
    'Estonia',
    'Estonsko',
    'ES',
    'Spain',
    'Španělsko',
    'FI',
    'Finland',
    'Finsko',
    'FR',
    'France',
    'Francie',
    'GR',
    'Greece',
    'Řecko',
    'HR',
    'Croatia',
    'Chorvatsko',
    'HU',
    'Hungary',
    'Maďarsko',
    'IE',
    'Ireland',
    'Irsko',
    'IT',
    'Italy',
    'Itálie',
    'LT',
    'Lithuania',
    'Litva',
    'LU',
    'Luxembourg',
    'Lucembursko',
    'LV',
    'Latvia',
    'Lotyšsko',
    'MT',
    'Malta',
    'NL',
    'Netherlands',
    'Nizozemsko',
    'PL',
    'Poland',
    'Polsko',
    'PT',
    'Portugal',
    'Portugalsko',
    'RO',
    'Romania',
    'Rumunsko',
    'SE',
    'Sweden',
    'Švédsko',
    'SI',
    'Slovenia',
    'Slovinsko',
    'SK',
    'Slovakia',
    'Slovensko'
  ].map(normalizeCountry)
)

const CZECH_COUNTRY_ALIASES = new Set(
  ['CZ', 'ČR', 'Česko', 'Česká republika', 'Czechia', 'Czech Republic'].map(
    normalizeCountry
  )
)

function normalizeCountry(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function classifyInvoiceDestination(
  invoice: InvoiceDestinationFields
): InvoiceDestination {
  const vatPrefix = invoice.client_vat_no?.trim().slice(0, 2).toUpperCase()

  if (vatPrefix === 'CZ') return 'domestic'
  if (vatPrefix && EU_VAT_PREFIXES.has(vatPrefix)) return 'eu'

  const country = invoice.client_country?.trim()
  if (!country) return 'unknown'

  const normalizedCountry = normalizeCountry(country)
  if (CZECH_COUNTRY_ALIASES.has(normalizedCountry)) return 'domestic'
  if (EU_COUNTRY_ALIASES.has(normalizedCountry)) return 'eu'

  return 'outside-eu'
}
