import { describe, expect, it } from 'vitest'
import { classifyInvoiceDestination } from './invoiceDestination'

describe('classifyInvoiceDestination', () => {
  it('classifies a US customer without an EU VAT ID as outside the EU', () => {
    expect(
      classifyInvoiceDestination({
        client_country: 'USA',
        client_vat_no: null
      })
    ).toBe('outside-eu')
  })

  it('classifies an EU customer by VAT ID prefix', () => {
    expect(
      classifyInvoiceDestination({
        client_country: 'Germany',
        client_vat_no: 'DE123456789'
      })
    ).toBe('eu')
  })

  it('classifies an EU customer by country when its VAT ID is missing', () => {
    expect(
      classifyInvoiceDestination({
        client_country: 'Německo',
        client_vat_no: null
      })
    ).toBe('eu')
  })

  it('does not mistake a domestic zero-VAT invoice for a non-EU invoice', () => {
    expect(
      classifyInvoiceDestination({
        client_country: 'Česká republika',
        client_vat_no: null
      })
    ).toBe('domestic')
  })

  it('leaves invoices without destination data unclassified', () => {
    expect(
      classifyInvoiceDestination({
        client_country: null,
        client_vat_no: null
      })
    ).toBe('unknown')
  })
})
