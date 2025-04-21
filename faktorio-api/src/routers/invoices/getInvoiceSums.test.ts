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
      vat_base_12: 0,
      vat_12: 0,
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
    // VAT 21%: (250 * 0.21) = 52.5
    // Total: 250 + 52.5 = 302.5

    expect(result.subtotal).toBeCloseTo(250)
    expect(result.total).toBeCloseTo(302.5)
    expect(result.native_subtotal).toBeCloseTo(250)
    expect(result.native_total).toBeCloseTo(302.5)
    expect(result.vat_base_21).toBeCloseTo(250)
    expect(result.vat_21).toBeCloseTo(52.5)
    expect(result.vat_base_12).toBeCloseTo(0)
    expect(result.vat_12).toBeCloseTo(0)
  })

  it('should calculate correct sums for mixed VAT rates (21%, 12%, 0%)', () => {
    const invoiceItems = [
      {
        quantity: 2,
        unit_price: 100,
        vat_rate: 21
      },
      {
        quantity: 3,
        unit_price: 50,
        vat_rate: 12
      },
      {
        quantity: 1,
        unit_price: 80,
        vat_rate: 12
      },
      {
        quantity: 5,
        unit_price: 20,
        vat_rate: 0
      }
    ]

    const result = getInvoiceSums(invoiceItems)

    // Expected calculations:
    // Base 21%: 200
    // Base 12%: 150 + 80 = 230
    // Base 0%: 100
    // Subtotal: 200 + 230 + 100 = 530
    // VAT 21%: 200 * 0.21 = 42
    // VAT 12%: 230 * 0.12 = 27.6
    // VAT 0%: 100 * 0 = 0
    // Total VAT: 42 + 27.6 + 0 = 69.6
    // Total: 530 + 69.6 = 599.6

    expect(result.subtotal).toBeCloseTo(530)
    expect(result.total).toBeCloseTo(599.6)
    expect(result.vat_base_21).toBeCloseTo(200)
    expect(result.vat_21).toBeCloseTo(42)
    expect(result.vat_base_12).toBeCloseTo(230)
    expect(result.vat_12).toBeCloseTo(27.6)
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
        vat_rate: 12
      },
      {
        quantity: 1,
        unit_price: 80,
        vat_rate: null
      }
    ]

    const result = getInvoiceSums(invoiceItems)

    // Subtotal should only include the item with null vat_rate but valid quantity/price
    expect(result.subtotal).toBeCloseTo(80)
    // Total = subtotal + vat21 + vat12 + vat0 = 80 + 0 + 0 + 0 = 80
    expect(result.total).toBeCloseTo(80)

    // VAT bases depend on vat_rate filter
    expect(result.vat_base_21).toBeCloseTo(0)
    expect(result.vat_21).toBeCloseTo(0)
    expect(result.vat_base_12).toBeCloseTo(0)
    expect(result.vat_12).toBeCloseTo(0)
    expect(result.vat_base_0).toBeCloseTo(0)
  })
})
