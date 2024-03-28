import { generateQrPaymentString } from './qrCodeGenerator'
import { BankingInfo } from './qrCodeGenerator'
import { describe, expect, it } from 'vitest'

describe('description', () => {
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
    expect(qrPaymentData2).toMatchInlineSnapshot(`"SPD*1.0*ACC:CZ6220100000002200152294*AM:10.00*CC:CZK*X-VS:112233"`)
  })
})
