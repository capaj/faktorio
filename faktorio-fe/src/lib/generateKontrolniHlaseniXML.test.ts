import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateKontrolniHlaseniXML,
  type SubmitterData
} from './generateKontrolniHlaseniXML'

import { ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { Invoice } from '@/components/IssuedInvoiceTable'

describe('generateKontrolniHlaseniXML', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should generate correct XML for a simple happy path', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-04-21'))

    const mockIssuedInvoices: Invoice[] = [
      {
        id: 'iss1',
        number: '2024-001',
        client_name: 'Client A',
        client_vat_no: 'CZ11111111', // Added mock VAT ID
        taxable_fulfillment_due: '2024-07-15',
        issued_on: '2024-07-10',
        sent_at: '2024-07-11',
        total: 12100,
        subtotal: 10000,
        native_subtotal: 10000, // Use native_subtotal for consistency
        native_total: 12100, // 21% VAT
        currency: 'CZK',
        exchange_rate: 1,
        paid_on: '2024-07-20'
      }
    ]

    const mockReceivedInvoices: ReceivedInvoice[] = [
      {
        id: 'rec1',
        supplier_name: 'Supplier B',
        supplier_vat_no: 'CZ22222222', // Added mock VAT ID
        invoice_number: 'INV-B-100',
        issue_date: '2024-08-01',
        due_date: '2024-08-15',
        total_without_vat: 5000,
        total_with_vat: 6050, // Below threshold
        currency: 'CZK',
        status: 'paid'
      },
      {
        id: 'rec2',
        supplier_name: 'Supplier C',
        supplier_vat_no: 'CZ33333333', // Added mock VAT ID
        invoice_number: 'INV-C-200',
        issue_date: '2024-08-05',
        due_date: '2024-08-20',
        total_without_vat: 15000,
        total_with_vat: 18150, // Above threshold
        currency: 'CZK',
        status: 'received'
      },
      {
        id: 'rec3',
        supplier_name: 'Supplier D (EUR)',
        supplier_vat_no: 'DE44444444', // Added mock VAT ID
        invoice_number: 'INV-D-300',
        issue_date: '2024-08-10',
        due_date: '2024-08-25',
        total_without_vat: 100,
        total_with_vat: 121, // EUR invoice, should go to B3 regardless of amount
        currency: 'EUR',
        status: 'received'
      }
    ]

    const mockSubmitterData: SubmitterData = {
      dic: 'CZ12345678',
      naz_obce: 'Brno',
      typ_ds: 'F',
      jmeno: 'Test',
      prijmeni: 'Submitter',
      ulice: 'Test Street 123',
      psc: '12345',
      stat: 'ČESKÁ REPUBLIKA',
      email: 'test@submitter.com'
    }

    const year = 2024
    const quarter = 3

    // --- Generate XML ---
    const xmlString = generateKontrolniHlaseniXML({
      issuedInvoices: mockIssuedInvoices,
      receivedInvoices: mockReceivedInvoices,
      submitterData: mockSubmitterData,
      year,
      quarter
    })

    expect(xmlString).toMatchSnapshot()
  })

  it('should handle reverse charge invoice inside czechia-czech contractor invoicing a czech company', () => {
    // this is a special case where the invoice is issued by a czech company to a czech company, but it is a reverse charge invoice. It only applies to a very limited set of goods and services, for example https://financnisprava.gov.cz/cs/financni-sprava/media-a-verejnost/tiskove-zpravy-gfr/tiskove-zpravy-2017/od-cervence-dochazi-k-rozsireni-rezimu-reverse-charge-na-dalsi-plneni

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-04-21'))

    const mockIssuedInvoices: Invoice[] = [
      {
        id: 'iss1',
        number: '2024-001',
        client_name: 'Client A',
        client_vat_no: 'CZ11111111', //
        taxable_fulfillment_due: '2024-07-15',
        issued_on: '2024-07-10',
        sent_at: '2024-07-11',
        total: 12100,
        subtotal: 12100,
        native_subtotal: 12100, // Use native_subtotal for consistency
        native_total: 12100, // 0% VAT for reverse charge
        currency: 'CZK',
        exchange_rate: 1,
        paid_on: '2024-07-20'
      }
    ]

    const mockReceivedInvoices: ReceivedInvoice[] = [
      {
        id: 'rec1',
        supplier_name: 'Supplier B',
        supplier_vat_no: 'CZ22222222', //
        invoice_number: 'INV-B-100',
        issue_date: '2024-08-01',
        due_date: '2024-08-15',
        total_without_vat: 5000,
        total_with_vat: 6050, // Below threshold
        currency: 'CZK',
        status: 'paid'
      }
    ]

    const mockSubmitterData: SubmitterData = {
      dic: 'CZ12345678',
      naz_obce: 'Brno',
      typ_ds: 'F',
      jmeno: 'Test',
      prijmeni: 'Submitter',
      ulice: 'Test Street 123',
      psc: '12345',
      stat: 'ČESKÁ REPUBLIKA',
      email: 'test@submitter.com'
    }
    const year = 2024
    const month = 7 // July
    // --- Generate XML ---
    const xmlString = generateKontrolniHlaseniXML({
      issuedInvoices: mockIssuedInvoices,
      receivedInvoices: mockReceivedInvoices,
      submitterData: mockSubmitterData,
      year,
      month
    })

    expect(xmlString).toMatchSnapshot()
  })
})
