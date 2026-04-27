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
        due_on: new Date('2024-07-20').toISOString(),
        issued_on: new Date('2024-07-10').toISOString(),
        sent_at: null,
        paid_on: new Date('2024-07-20').toISOString(),
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 10000,
        native_subtotal: 10000, // Use native_subtotal for consistency
        native_total: 12100, // 21% VAT
        total: 12100, // 21% VAT
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK'
      },
      {
        id: '2',
        number: 'INV002',
        client_name: 'Client B',
        client_vat_no: 'CZ11223344',
        issued_on: new Date('2024-08-01').toISOString(),
        due_on: new Date('2024-08-05').toISOString(),
        sent_at: new Date('2024-08-02').toISOString(),
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-08-05').toISOString(),
        subtotal: 5000,
        total: 6050, // 21% VAT
        native_subtotal: 5000, // Use native_subtotal for consistency
        native_total: 6050, // 21% VAT
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
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
        taxable_supply_date: new Date('2024-07-20').toISOString(),
        due_date: '2024-08-05',
        status: 'received',
        total_without_vat: 2000,
        total_with_vat: 2420, // 21% VAT
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK',
        exchange_rate: 1
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
      czkSumEurServices: 13000
    })

    // Replace specific assertions with snapshot matching
    expect(xmlString).toMatchSnapshot()
  })

  it('should subtract received credit notes from totals and VAT deductions', () => {
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
        due_on: new Date('2024-07-20').toISOString(),
        issued_on: new Date('2024-07-10').toISOString(),
        sent_at: null,
        paid_on: new Date('2024-07-20').toISOString(),
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 10000,
        native_subtotal: 10000,
        native_total: 12100,
        total: 12100,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
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
        taxable_supply_date: new Date('2024-07-20').toISOString(),
        due_date: '2024-08-05',
        status: 'received',
        total_without_vat: 2000,
        total_with_vat: 2420,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK',
        exchange_rate: 1
      },
      {
        id: 'rec2',
        invoice_number: 'REC002',
        supplier_name: 'Supplier X',
        supplier_vat_no: 'CZ99887766',
        issue_date: new Date('2024-07-25').toISOString(),
        taxable_supply_date: new Date('2024-07-25').toISOString(),
        due_date: '2024-08-10',
        status: 'received',
        total_without_vat: -1500,
        total_with_vat: -1815,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK',
        exchange_rate: 1
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices,
      submitterData,
      year: 2024,
      quarter: 3,
      czkSumEurServices: 0
    })

    expect(xmlString).toMatch(
      /<Veta4[\s\S]*pln23="500" odp_tuz23_nar="105"[\s\S]*odp_sum_nar="105"/
    )
    expect(xmlString).toMatch(
      /<Veta6[\s\S]*dan_zocelk="2100" odp_zocelk="105" dano_da="1995"/
    )
  })

  it('calculates row 1 VAT directly from the summed base to match ADIS validation', () => {
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
        due_on: new Date('2024-07-20').toISOString(),
        issued_on: new Date('2024-07-10').toISOString(),
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 100000,
        native_subtotal: 100000,
        native_total: 120940,
        total: 120940,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK'
      },
      {
        id: '2',
        number: 'INV002',
        client_name: 'Client B',
        client_vat_no: 'CZ11223344',
        due_on: new Date('2024-07-25').toISOString(),
        issued_on: new Date('2024-07-15').toISOString(),
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 256756,
        native_subtotal: 256756,
        native_total: 310515,
        total: 310515,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK'
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices: [],
      submitterData,
      year: 2024,
      quarter: 3,
      czkSumEurServices: 0
    })

    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="356756" dan23="74919"/)
  })

  it('uses 21% VAT breakdown fields when invoices contain multiple VAT rates', () => {
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
        due_on: new Date('2024-07-20').toISOString(),
        issued_on: new Date('2024-07-10').toISOString(),
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: new Date('2024-07-15').toISOString(),
        subtotal: 1120,
        native_subtotal: 1120,
        native_total: 1316,
        vat_base_21: 800,
        vat_21: 168,
        vat_base_12: 320,
        vat_12: 38.4,
        total: 1316,
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
        taxable_supply_date: new Date('2024-07-20').toISOString(),
        due_date: '2024-08-05',
        status: 'received',
        total_without_vat: 560,
        total_with_vat: 658,
        vat_base_21: 400,
        vat_21: 84,
        vat_base_12: 160,
        vat_12: 19.2,
        currency: 'CZK',
        exchange_rate: 1
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices,
      submitterData,
      year: 2024,
      quarter: 3,
      czkSumEurServices: 0
    })

    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="800" dan23="168"/)
    expect(xmlString).toMatch(
      /<Veta4[\s\S]*pln23="400" odp_tuz23_nar="84"[\s\S]*odp_sum_nar="84"/
    )
  })

  it('falls back to native_subtotal for legacy invoices with null vat_base_21 when other invoices have the breakdown populated', () => {
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
        number: '2026-021',
        client_name: 'Greenometer s.r.o.',
        client_vat_no: 'CZ87654321',
        due_on: '2026-02-09',
        issued_on: '2026-02-02',
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: '2026-01-31',
        subtotal: 137834,
        native_subtotal: 137834,
        native_total: 166779.14,
        total: 166779.14,
        vat_base_21: null,
        vat_21: null,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK'
      },
      {
        id: '2',
        number: '2026-022',
        client_name: 'Greenometer s.r.o.',
        client_vat_no: 'CZ87654321',
        due_on: '2026-03-10',
        issued_on: '2026-03-01',
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: '2026-02-28',
        subtotal: 138808,
        native_subtotal: 138808,
        native_total: 167840.5,
        total: 167840.5,
        vat_base_21: 138808,
        vat_21: 29032.5,
        vat_base_12: 0,
        vat_12: 0,
        currency: 'CZK'
      },
      {
        id: '3',
        number: '2026-023',
        client_name: 'Greenometer s.r.o.',
        client_vat_no: 'CZ87654321',
        due_on: '2026-03-30',
        issued_on: '2026-03-21',
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: '2026-03-21',
        subtotal: 80114,
        native_subtotal: 80114,
        native_total: 96835.25,
        total: 96835.25,
        vat_base_21: 80114,
        vat_21: 16721.25,
        vat_base_12: 0,
        vat_12: 0,
        currency: 'CZK'
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices: [],
      submitterData,
      year: 2026,
      quarter: 1,
      czkSumEurServices: 0
    })

    // 137834 + 138808 + 80114 = 356756 (regardless of breakdown availability)
    // 356756 * 0.21 = 74918.76 -> rounds to 74919
    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="356756" dan23="74919"/)
  })

  it('excludes non-VATable line items (e.g. § 36 odst. 11 přeúčtování) from obrat23', () => {
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

    // Q1 2026 export: invoice 2026-023 has an 80,114 CZK subtotal, but only
    // 79,625 is at 21% — the remaining 489 is a § 36 odst. 11 přeúčtování
    // (not subject to VAT). obrat23 must report only the 21% portion.
    const issuedInvoices: Invoice[] = [
      {
        id: '3',
        number: '2026-023',
        client_name: 'Greenometer s.r.o.',
        client_vat_no: 'CZ87654321',
        due_on: '2026-03-30',
        issued_on: '2026-03-21',
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: '2026-03-21',
        subtotal: 80114,
        native_subtotal: 80114,
        native_total: 96835.25,
        total: 96835.25,
        vat_base_21: 79625,
        vat_21: 16721.25,
        vat_base_12: null,
        vat_12: null,
        currency: 'CZK'
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices: [],
      submitterData,
      year: 2026,
      quarter: 1,
      czkSumEurServices: 0
    })

    // 79625 * 0.21 = 16721.25 -> rounds to 16721
    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="79625" dan23="16721"/)
  })

  it('uses CZK-converted values for non-CZK invoices instead of raw vat_base_21', () => {
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

    // EUR invoice: 1000 EUR base at exchange rate 25 -> 25000 CZK base
    // vat_base_21 is stored in original currency (EUR) per getInvoiceSums.ts,
    // so summing it directly mixes EUR with CZK from other invoices.
    const issuedInvoices: Invoice[] = [
      {
        id: '1',
        number: 'EUR-001',
        client_name: 'EU Client',
        client_vat_no: 'DE123456789',
        due_on: '2026-02-09',
        issued_on: '2026-02-02',
        sent_at: null,
        paid_on: null,
        exchange_rate: 25,
        taxable_fulfillment_due: '2026-01-31',
        subtotal: 1000,
        native_subtotal: 25000,
        native_total: 30250,
        total: 1210,
        vat_base_21: 1000, // stored in EUR, not CZK
        vat_21: 210,
        vat_base_12: 0,
        vat_12: 0,
        currency: 'EUR'
      },
      {
        id: '2',
        number: 'CZK-001',
        client_name: 'Czech Client',
        client_vat_no: 'CZ87654321',
        due_on: '2026-02-09',
        issued_on: '2026-02-02',
        sent_at: null,
        paid_on: null,
        exchange_rate: 1,
        taxable_fulfillment_due: '2026-01-31',
        subtotal: 50000,
        native_subtotal: 50000,
        native_total: 60500,
        total: 60500,
        vat_base_21: 50000,
        vat_21: 10500,
        vat_base_12: 0,
        vat_12: 0,
        currency: 'CZK'
      }
    ]

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices,
      receivedInvoices: [],
      submitterData,
      year: 2026,
      quarter: 1,
      czkSumEurServices: 0
    })

    // Expected base in CZK: 25000 (EUR converted) + 50000 (CZK) = 75000
    // 75000 * 0.21 = 15750
    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="75000" dan23="15750"/)
  })

  // Restore real timers after tests
  afterAll(() => {
    vi.useRealTimers()
  })
})
