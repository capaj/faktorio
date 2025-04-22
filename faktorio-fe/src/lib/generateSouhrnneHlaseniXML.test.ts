import { describe, it, expect, vi } from 'vitest'
import { SubmitterData } from './generateKontrolniHlaseniXML'
import { generateSouhrnneHlaseniXML } from './generateSouhrnneHlaseniXML'

// Define a type for the test invoice structure matching tRPC result expectation
type TestInvoice = {
  id: string
  invoice_number?: string | null
  customer_name?: string | null
  client_vat_no?: string | null
  issue_date?: string | null
  due_date?: string | null
}

describe('generateSouhrnneHlaseniXML', () => {
  it('should generate correct XML using correct field names', () => {
    const submitterData: SubmitterData = {
      dic: 'CZ8807204153',
      typ_ds: 'F',
      prijmeni: 'Špác',
      jmeno: 'Jiří',
      naz_obce: 'SOKOLNICE',
      ulice: 'Třešňová',
      c_pop: '823', // Added house number
      psc: '66452',
      stat: 'ČESKÁ REPUBLIKA',
      email: 'test@example.com'
    }

    const issuedInvoices = [
      {
        id: '1',
        invoice_number: '2025-001',
        customer_name: 'Test CZ Client',
        client_vat_no: 'CZ12345678',
        issue_date: '2025-03-01',
        native_total: 12100, // CZK invoice, should be ignored
        currency: 'CZK'
      },
      {
        id: '2',
        invoice_number: '2025-002',
        customer_name: 'First DE Client GmbH',
        client_vat_no: 'DE360131145',
        issue_date: '2025-02-28',
        native_total: 76388.8125, // Use native_total
        currency: 'EUR' // EUR invoice, should be included
      },
      {
        id: '3',
        invoice_number: '2025-003',
        customer_name: 'Another DE Client GmbH',
        client_vat_no: 'DE987654321',
        issue_date: '2025-03-10',
        native_total: 25000.5, // Use native_total
        currency: 'EUR'
      },
      {
        id: '4',
        invoice_number: '2025-004',
        customer_name: 'French Client SARL',
        client_vat_no: 'FR12345678901',
        issue_date: '2025-03-15',
        native_total: 50000.0, // Use native_total
        currency: 'EUR'
      }
    ]

    const year = 2025
    const quarter = 1

    const result = generateSouhrnneHlaseniXML({
      issuedInvoices,
      submitterData,
      year,
      quarter
    })

    // Use snapshot matching
    expect(result).toMatchSnapshot()
  })

  // ... (keep the test for empty invoices, adjusting the invoice type) ...
  it('should throw an error if no relevant EUR invoices are found', () => {
    const submitterData: SubmitterData = {
      dic: 'CZ123',
      typ_ds: 'F',
      prijmeni: 'Test',
      jmeno: 'User',
      naz_obce: 'City',
      ulice: 'Street',
      psc: '12345',
      stat: 'CZ',
      email: 'e@ma.il'
    }
    const issuedInvoices = [
      {
        id: '1',
        invoice_number: '2025-001',
        client_vat_no: 'CZ123',
        issue_date: '2025-03-01',
        native_total: 1000,
        currency: 'CZK'
      },
      {
        id: '2',
        invoice_number: '2025-002',
        native_total: 50,
        currency: 'USD'
      }
    ]

    expect(() =>
      generateSouhrnneHlaseniXML({
        issuedInvoices,
        submitterData,
        year: 2025,
        quarter: 1
      })
    ).toThrow('No relevant EUR invoices found for Souhrnné hlášení generation.')
  })
})
