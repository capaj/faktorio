import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCNBExchangeRate } from './getCNBExchangeRate'

describe('getCNBExchangeRate', () => {
  const mockResponse = `19.02.2025 #35
země|měna|množství|kód|kurz
Austrálie|dolar|1|AUD|15,286
EMU|euro|1|EUR|25,100
USA|dolar|1|USD|24,065`

  beforeEach(() => {
    global.fetch = vi.fn()
    vi.setSystemTime(new Date('2024-02-19'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 1 for CZK', async () => {
    const rate = await getCNBExchangeRate({ currency: 'CZK' })
    expect(rate).toBe(1)
  })

  it('returns correct rate for EUR', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      text: () => Promise.resolve(mockResponse)
    } as Response)

    const rate = await getCNBExchangeRate({ currency: 'EUR' })
    expect(rate).toBe(25.1)
  })

  it('returns correct rate for USD', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      text: () => Promise.resolve(mockResponse)
    } as Response)

    const rate = await getCNBExchangeRate({ currency: 'USD' })
    expect(rate).toBe(24.065)
  })

  it('returns correct historical rate for EUR', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      text: () => Promise.resolve(mockResponse)
    } as Response)

    const date = '2023-02-19'
    const rate = await getCNBExchangeRate({ currency: 'EUR', date })
    expect(rate).toBe(25.1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt?date=19.02.2023'
    )
  })

  it('returns today rate for future date', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      text: () => Promise.resolve(mockResponse)
    } as Response)

    const futureDate = '2025-02-19'
    const rate = await getCNBExchangeRate({ currency: 'EUR', date: futureDate })
    expect(rate).toBe(25.1)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt'
    )
  })

  it('returns null for non-existent currency', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      text: () => Promise.resolve(mockResponse)
    } as Response)

    const rate = await getCNBExchangeRate({ currency: 'XXX' })
    expect(rate).toBeNull()
  })

  it('handles network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    await expect(getCNBExchangeRate({ currency: 'EUR' })).rejects.toThrow(
      'Network error'
    )
  })
})
