import {
  BankingInfo,
  generateQrPaymentString,
  normalizeAccountNumberForQrPayment
} from './qrCodeGenerator'
import QRCode from 'qrcode'
import { readFileSync } from 'node:fs'
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
      accountNumber: '670100-9999999999/1111',
      amount: 100,
      currency: 'CZK',
      variableSymbol: '20260001'
    })

    expect(qrPaymentData).toBe(
      'SPD*1.0*ACC:CZ7511116701009999999999*AM:100.00*CC:CZK*X-VS:20260001'
    )
  })

  it('keeps the scannable QR payment image unchanged for a Czech domestic account', async () => {
    const qrPaymentData = generateQrPaymentString({
      accountNumber: '670100-9999999999/1111',
      amount: 100,
      currency: 'CZK',
      variableSymbol: '20260001'
    })

    expect(qrPaymentData).not.toBeNull()

    if (!qrPaymentData) {
      throw new Error('QR payment data was not generated')
    }

    const qrCodeImage = await QRCode.toBuffer(qrPaymentData, {
      errorCorrectionLevel: 'M',
      margin: 4,
      scale: 8,
      type: 'png'
    })
    const qrCodeImageSnapshot = readFileSync(
      new URL(
        './__snapshots__/qr-payment-czech-domestic-account.png',
        import.meta.url
      )
    )

    expect(qrCodeImage).toEqual(qrCodeImageSnapshot)
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
