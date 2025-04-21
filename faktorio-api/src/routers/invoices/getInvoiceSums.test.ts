import { describe, it, expect } from 'vitest'
import { getInvoiceSums } from './getInvoiceSums'

describe('getInvoiceSums', () => {
  it('should calculate correct sums for empty array', () => {
    const result = getInvoiceSums([])

    expect(result).toEqual({
      subtotal: 0,
      total: 0,
      native_subtotal: 0,
      native_total: 0,
      vat_base_21: 0,
      vat_21: 0,
      vat_base_15: 0,
      vat_15: 0,
      vat_base_10: 0,
      vat_10: 0,
      vat_base_0: 0
    })
  })

  it('should calculate correct sums for items with 21% VAT', () => {
    const invoiceItems = [
      {
        quantity: 2,
        unit_price: 100,
        vat_rate: 21
      },
      {
        quantity: 1,
        unit_price: 50,
        vat_rate: 21
      }
    ]

    const result = getInvoiceSums(invoiceItems)

    // Expected calculations:
    // Subtotal: (2*100) + (1*50) = 250
    // VAT: (250 * 21/100) = 52.5
    // Total: 250 + 52.5 = 302.5

    expect(result.subtotal).toBeCloseTo(250)
    expect(result.total).toBeCloseTo(302.5)
    expect(result.native_subtotal).toBeCloseTo(250)
    expect(result.native_total).toBeCloseTo(302.5)
    expect(result.vat_base_21).toBeCloseTo(250)
    expect(result.vat_21).toBeCloseTo(52.5)
  })

  it('should calculate correct sums for mixed VAT rates', () => {
    const invoiceItems = [
      {
        quantity: 2,
        unit_price: 100,
        vat_rate: 21
      },
      {
        quantity: 3,
        unit_price: 50,
        vat_rate: 15
      },
      {
        quantity: 1,
        unit_price: 80,
        vat_rate: 10
      },
      {
        quantity: 5,
        unit_price: 20,
        vat_rate: 0
      }
    ]

    const result = getInvoiceSums(invoiceItems)

    // Expected calculations:
    // Subtotal: (2*100) + (3*50) + (1*80) + (5*20) = 200 + 150 + 80 + 100 = 530
    // VAT for 21%: (200 * 0.21) = 42
    // VAT for 15%: (150 * 0.15) = 22.5
    // VAT for 10%: (80 * 0.10) = 8
    // VAT for 0%: (100 * 0) = 0
    // Total VAT: 42 + 22.5 + 8 + 0 = 72.5
    // Total: 530 + 72.5 = 602.5

    expect(result.subtotal).toBeCloseTo(530)
    expect(result.total).toBeCloseTo(602.5)
    expect(result.vat_base_21).toBeCloseTo(200)
    expect(result.vat_21).toBeCloseTo(42)
    expect(result.vat_base_15).toBeCloseTo(150)
    expect(result.vat_15).toBeCloseTo(22.5)
    expect(result.vat_base_10).toBeCloseTo(80)
    expect(result.vat_10).toBeCloseTo(8)
    expect(result.vat_base_0).toBeCloseTo(100)
  })

  it('should handle null or undefined values', () => {
    const invoiceItems = [
      {
        quantity: null,
        unit_price: 100,
        vat_rate: 21
      },
      {
        quantity: 3,
        unit_price: null,
        vat_rate: 15
      },
      {
        quantity: 1,
        unit_price: 80,
        vat_rate: null
      }
    ]

    const result = getInvoiceSums(invoiceItems)

    // The third item has quantity=1, unit_price=80, and null vat_rate
    // This should be included in the subtotal, making it 80
    expect(result.subtotal).toBeCloseTo(80)

    // The vat_base calculations depend on the vat_rate filter
    // Items with vat_rate 21 but null quantity -> 0
    expect(result.vat_base_21).toBeCloseTo(0)

    // Items with vat_rate 15 but null unit_price -> 0
    expect(result.vat_base_15).toBeCloseTo(0)

    // Items with null vat_rate are not included in any specific category
    expect(result.vat_base_0).toBeCloseTo(0)
  })
})
