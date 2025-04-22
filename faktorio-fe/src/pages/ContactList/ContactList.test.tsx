import { describe, it, expect } from 'vitest'
import {
  formatStreetAddress,
  AresBusinessInformationSchema
} from './ContactList'
import { z } from 'zod'

// Helper to create minimal mock data satisfying the function's needs
const createMockAresData = (
  sidlo: Partial<z.infer<typeof AresBusinessInformationSchema>['sidlo']>
): z.infer<typeof AresBusinessInformationSchema> => {
  // Provide minimal defaults for required fields not used by the function
  return {
    ico: '12345678',
    obchodniJmeno: 'Test Company',
    pravniForma: 's.r.o.',
    financniUrad: null,
    datumVzniku: '2023-01-01',
    datumAktualizace: '2024-01-01',
    dic: undefined,
    icoId: 'CZ12345678',
    adresaDorucovaci: {
      radekAdresy1: 'Delivery Address 1',
      radekAdresy2: undefined,
      radekAdresy3: undefined
    },
    primarniZdroj: 'ARES',
    czNace: ['12345'],
    sidlo: {
      kodStatu: 'CZ',
      nazevStatu: 'Česká republika',
      kodKraje: 19,
      nazevKraje: 'Hlavní město Praha',
      kodOkresu: undefined,
      nazevOkresu: undefined,
      kodObce: 554782,
      nazevObce: 'Praha',
      kodUlice: undefined,
      nazevUlice: undefined,
      cisloDomovni: 123,
      kodCastiObce: 490130,
      nazevCastiObce: 'Nové Město',
      kodAdresnihoMista: 123456,
      psc: 11000,
      textovaAdresa: 'Mock Text Address',
      typCisloDomovni: 1,
      standardizaceAdresy: true,
      kodSpravnihoObvodu: undefined,
      nazevSpravnihoObvodu: undefined,
      kodMestskehoObvodu: undefined,
      nazevMestskehoObvodu: undefined,
      kodMestskeCastiObvodu: undefined,
      nazevMestskeCastiObvodu: undefined,
      cisloOrientacni: undefined,
      ...sidlo
    }
  }
}

describe('formatStreetAddress', () => {
  it('should format address with street name and orientation number', () => {
    const aresData = createMockAresData({
      nazevUlice: 'Hlavní',
      cisloDomovni: 456,
      cisloOrientacni: 10,
      nazevCastiObce: 'Nezáleží'
    })
    expect(formatStreetAddress(aresData)).toBe('Hlavní 456/10')
  })

  it('should format address with street name but no orientation number', () => {
    const aresData = createMockAresData({
      nazevUlice: 'Vedlejší',
      cisloDomovni: 789,
      cisloOrientacni: undefined,
      nazevCastiObce: 'Nezáleží'
    })
    expect(formatStreetAddress(aresData)).toBe('Vedlejší 789')
  })

  it('should format address using part name when street name is missing, with orientation number', () => {
    const aresData = createMockAresData({
      nazevUlice: undefined, // Missing street name
      nazevCastiObce: 'Staré Město',
      cisloDomovni: 12,
      cisloOrientacni: 5
    })
    expect(formatStreetAddress(aresData)).toBe('Staré Město 12/5')
  })

  it('should format address using part name when street name is missing, without orientation number', () => {
    const aresData = createMockAresData({
      nazevUlice: undefined, // Missing street name
      nazevCastiObce: 'Vinohrady',
      cisloDomovni: 34,
      cisloOrientacni: undefined
    })
    expect(formatStreetAddress(aresData)).toBe('Vinohrady 34')
  })

  it('should handle missing street and part name (though unlikely with schema)', () => {
    // This tests the nullish coalescing operator, though the schema might prevent this
    const aresData = createMockAresData({
      nazevUlice: undefined,
      nazevCastiObce: undefined, // Both missing
      cisloDomovni: 56,
      cisloOrientacni: 7
    })

    expect(formatStreetAddress(aresData)).toBe(' 56/7')
  })
})
