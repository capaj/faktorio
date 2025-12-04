const RPO_BASE_URL = 'https://datahub.ekosystem.slovensko.digital/api/data/rpo'

export interface RpoIdentifierEntry {
  id: number
  organization_id: number
  ipo: number
  effective_from: string
  effective_to: string | null
  created_at: string
  updated_at: string
}

export interface RpoNameEntry {
  id: number
  organization_id: number
  name: string
  effective_from: string
  effective_to: string | null
  created_at: string
  updated_at: string
}

export interface RpoAddressEntry {
  id: number
  organization_id: number
  formatted_address: string | null
  street: string | null
  reg_number: number | null
  building_number: string | null
  postal_code: string | null
  municipality: string | null
  country: string | null
  effective_from: string
  effective_to: string | null
  created_at: string
  updated_at: string
}

export interface RpoOrganization {
  id: number
  established_on: string | null
  terminated_on: string | null
  actualized_at: string | null
  source_register: string | null
  registration_office: string | null
  registration_number: string | null
  identifier_entries: RpoIdentifierEntry[]
  name_entries: RpoNameEntry[]
  address_entries: RpoAddressEntry[]
}

export async function getRpoOrganizationById(
  id: string
): Promise<RpoOrganization> {
  const res = await fetch(`${RPO_BASE_URL}/organizations/${id}`)
  if (!res.ok) {
    throw new Error(`RPO request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<RpoOrganization>
}

export function getCurrentName(org: RpoOrganization): string | undefined {
  return org.name_entries[0]?.name
}

export function getCurrentIco(org: RpoOrganization): string | undefined {
  const entry = org.identifier_entries[0]
  return entry ? String(entry.ipo) : undefined
}

export function getCurrentAddress(
  org: RpoOrganization
): Partial<{
  street: string
  street2: string
  city: string
  zip: string
  country: string
}> {
  const address = org.address_entries[0]
  if (!address) return {}

  const regNumber =
    address.building_number ?? (address.reg_number ? String(address.reg_number) : '')
  const street = [address.street, regNumber].filter(Boolean).join(' ').trim()

  return {
    street: street || address.formatted_address || '',
    street2: address.formatted_address ?? '',
    city: address.municipality ?? '',
    zip: address.postal_code ?? '',
    country: address.country ?? 'Slovensko'
  }
}
