import {
  AresBusinessInformationSchema,
  formatStreetAddress
} from '@/lib/ares'
import {
  getCurrentAddress,
  getCurrentName,
  getRpoOrganizationById
} from '@/lib/rpo'

export const companyRegistryOptions = [
  { value: 'ares', label: 'ARES (ČR)' },
  { value: 'rpo', label: 'RPO (SR)' }
] as const

export type CompanyRegistry = (typeof companyRegistryOptions)[number]['value']

export const registryLabels: Record<CompanyRegistry, string> = {
  ares: 'ARES (ČR)',
  rpo: 'RPO (SR)'
}

export const isValidRegistrationNo = (
  registry: CompanyRegistry,
  registrationNo?: string | null
) => {
  const normalized = registrationNo?.trim() ?? ''
  if (!normalized) return false

  return registry === 'ares'
    ? /^\d{8}$/.test(normalized)
    : /^\d{6,8}$/.test(normalized)
}

export type RegistryCompanyData = Partial<{
  name: string
  street: string
  street2: string
  city: string
  zip: string
  vat_no: string
  country: string
}>

export const fetchCompanyFromRegistry = async (
  registry: CompanyRegistry,
  registrationNo: string
): Promise<RegistryCompanyData> => {
  const normalizedRegistrationNo = registrationNo.trim()
  if (!normalizedRegistrationNo) throw new Error('Chybí IČO')

  if (!isValidRegistrationNo(registry, registrationNo)) {
    throw new Error('Neplatný formát IČO pro zvolený registr')
  }

  if (registry === 'ares') {
    const aresResponse = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${normalizedRegistrationNo}`
    )
    if (!aresResponse.ok) {
      throw new Error(`ARES request failed: ${aresResponse.status}`)
    }
    const parse = AresBusinessInformationSchema.safeParse(await aresResponse.json())
    if (!parse.success) {
      throw new Error('Nepodařilo se zpracovat data z ARESU')
    }
    const aresData = parse.data
    return {
      name: aresData.obchodniJmeno,
      street: formatStreetAddress(aresData),
      street2: aresData.sidlo.nazevCastiObce,
      city: aresData.sidlo.nazevObce,
      zip: String(aresData.sidlo.psc),
      vat_no: aresData.dic ?? '',
      country: aresData.sidlo.nazevStatu
    }
  }

  const rpoData = await getRpoOrganizationById(normalizedRegistrationNo)
  return {
    name: getCurrentName(rpoData),
    ...getCurrentAddress(rpoData),
    vat_no: ''
  }
}
