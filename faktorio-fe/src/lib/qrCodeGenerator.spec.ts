import {
  BankingInfo,
  generateQrPaymentString,
  normalizeAccountNumberForQrPayment
} from './qrCodeGenerator'
import { describe, expect, it } from 'vitest'

describe('generateQrPaymentString', () => {
  it('should generate', () => {
    // Example usage:
    const bankingInfo: BankingInfo = {
      accountNumber: 'CZ2806000000000000000123',
      amount: 450.0,
      currency: 'CZK',
      message: 'PLATBA ZA ZBOZI',
      variableSymbol: '1234567890'
    }

    const qrPaymentData = generateQrPaymentString(bankingInfo)
    expect(qrPaymentData).toMatchInlineSnapshot(
      `"SPD*1.0*ACC:CZ2806000000000000000123*AM:450.00*CC:CZK*MSG:PLATBA ZA ZBOZI*X-VS:1234567890"`
    )

    const bankingInfo2: BankingInfo = {
      accountNumber: 'CZ6220100000002200152294',
      amount: 10,
      currency: 'CZK',

      variableSymbol: '112233'
    }

    const qrPaymentData2 = generateQrPaymentString(bankingInfo2)
    expect(qrPaymentData2).toMatchInlineSnapshot(
      `"SPD*1.0*ACC:CZ6220100000002200152294*AM:10.00*CC:CZK*X-VS:112233"`
    )
  })

  it('converts Czech domestic account numbers to IBAN for SPD QR payments', () => {
    const qrPaymentData = generateQrPaymentString({
      accountNumber: '670100-2214376555/6210',
      amount: 100,
      currency: 'CZK',
      variableSymbol: '20260001'
    })

    expect(qrPaymentData).toBe(
      'SPD*1.0*ACC:CZ4362106701002214376555*AM:100.00*CC:CZK*X-VS:20260001'
    )
  })
})

describe('normalizeAccountNumberForQrPayment', () => {
  it('normalizes Czech domestic account variants to IBAN', () => {
    expect(normalizeAccountNumberForQrPayment('19-2000145399/0800')).toBe(
      'CZ6508000000192000145399'
    )
    expect(normalizeAccountNumberForQrPayment('2214376555/6210')).toBe(
      'CZ7662100000002214376555'
    )
    expect(
      normalizeAccountNumberForQrPayment(' CZ28 0600 0000 0000 0000 0123 ')
    ).toBe('CZ2806000000000000000123')
  })
})
