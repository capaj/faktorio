import { describe, it, expect, vi, afterAll } from 'vitest'
import { generateDanovePriznaniXML } from './generateDanovePriznaniXML'
import { type Invoice } from '@/components/IssuedInvoiceTable'
import { type ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { type SubmitterData } from './generateKontrolniHlaseniXML'

describe('generateDanovePriznaniXML', () => {
  // Mock the current date to ensure consistent snapshots
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-10-21T10:00:00Z'))

  it('should generate correct XML for a simple happy path scenario', () => {
    const submitterData: SubmitterData = {
      dic: 'CZ12345678',
      naz_obce: 'Brno',
      typ_ds: 'F',
      jmeno: 'Test',
      prijmeni: 'Submitter',
      ulice: 'Test Street 1',
      psc: '12345',
      stat: 'ČESKÁ REPUBLIKA',
      email: 'test@example.com'
    }

    const issuedInvoices: Invoice[] = [
      {
        id: '1',
        number: 'INV001',
        client_name: 'Client A',
        client_vat_no: 'CZ87654321',
        issued_on: new Date('2024-07-10').toISOString(),
        sent_at: null,
        paid_on: new Date('2024-07-20').toISOString(),
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 10000,
        total: 12100, // 21% VAT
        currency: 'CZK'
      },
      {
        id: '2',
        number: 'INV002',
        client_name: 'Client B',
        client_vat_no: 'CZ11223344',
        issued_on: new Date('2024-08-01').toISOString(),
        sent_at: new Date('2024-08-02').toISOString(),
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-08-05').toISOString(),
        subtotal: 5000,
        total: 6050, // 21% VAT
        currency: 'CZK'
      }
    ]

    const receivedInvoices: ReceivedInvoice[] = [
      {
        id: 'rec1',
        invoice_number: 'REC001',
        supplier_name: 'Supplier X',
        supplier_vat_no: 'CZ99887766',
        issue_date: new Date('2024-07-20').toISOString(),
        due_date: '2024-08-05',
        status: 'received',
        total_without_vat: 2000,
        total_with_vat: 2420, // 21% VAT
        currency: 'CZK'
      }
    ]

    const year = 2024
    const quarter = 3

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices,
      submitterData,
      year,
      quarter,
      eurInvoiceSum: 13000
    })

    // Replace specific assertions with snapshot matching
    expect(xmlString).toMatchSnapshot()
  })

  // Restore real timers after tests
  afterAll(() => {
    vi.useRealTimers()
  })
})
