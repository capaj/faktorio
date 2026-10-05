import { describe, it, expect, vi, afterAll } from 'vitest'
import {
  generateDanovePriznaniXML,
  hasIssuedVatAmounts
} from './generateDanovePriznaniXML'
import { type Invoice } from '@/components/IssuedInvoiceTable'
import { type ReceivedInvoice } from '@/components/ReceivedInvoiceTable'
import { type SubmitterData } from './generateKontrolniHlaseniXML'

const submitter: SubmitterData = {
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

function issuedInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'issued',
    number: 'INV001',
    client_name: 'Client',
    client_country: 'Česká republika',
    client_vat_no: 'CZ87654321',
    issued_on: '2026-01-10',
    taxable_fulfillment_due: '2026-01-10',
    due_on: '2026-01-24',
    sent_at: null,
    paid_on: null,
    currency: 'CZK',
    exchange_rate: 1,
    subtotal: 1000,
    total: 1210,
    native_subtotal: 1000,
    native_total: 1210,
    vat_base_21: null,
    vat_21: null,
    vat_base_12: null,
    vat_12: null,
    ...overrides
  }
}

function receivedInvoice(
  overrides: Partial<ReceivedInvoice> = {}
): ReceivedInvoice {
  return {
    id: 'received',
    invoice_number: 'REC001',
    supplier_name: 'Supplier',
    supplier_vat_no: 'CZ99887766',
    issue_date: '2026-01-10',
    taxable_supply_date: '2026-01-10',
    due_date: '2026-01-24',
    status: 'received',
    currency: 'CZK',
    exchange_rate: 1,
    total_without_vat: 1000,
    total_with_vat: 1210,
    vat_base_21: null,
    vat_21: null,
    vat_base_12: null,
    vat_12: null,
    ...overrides
  }
}

function exportInvoices(
  issuedInvoices: Invoice[],
  receivedInvoices: ReceivedInvoice[] = []
) {
  return generateDanovePriznaniXML({
    issuedInvoices,
    receivedInvoices,
    submitterData: submitter,
    year: 2026,
    month: 1,
    czkSumEurServices: 0
  })
}

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
        client_country: 'Česká republika',
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
        client_country: 'Česká republika',
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
        client_country: 'Česká republika',
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

  it('uses recorded total minus base for legacy invoices instead of recomputing VAT', () => {
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
        client_country: 'Česká republika',
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
        client_country: 'Česká republika',
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

    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="356756" dan23="74699"/)
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
        client_country: 'Česká republika',
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
      /<Veta4[\s\S]*pln23="400" odp_tuz23_nar="84"[\s\S]*pln5="160" odp_tuz5_nar="19"[\s\S]*odp_sum_nar="103"/
    )
    expect(xmlString).toContain('obrat5="320" dan5="38"')
    expect(xmlString).toContain(
      'dan_zocelk="206" odp_zocelk="103" dano_da="103"'
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
        client_country: 'Česká republika',
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
        client_country: 'Česká republika',
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
        client_country: 'Česká republika',
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
    // Recorded VAT: 28945.14 + 29032.50 + 16721.25 = 74698.89 -> 74699.
    expect(xmlString).toMatch(/<Veta1[\s\S]*obrat23="356756" dan23="74699"/)
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
        client_country: 'Česká republika',
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
        client_country: 'Germany',
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
        client_country: 'Česká republika',
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

  it('reports services supplied outside the EU on row 26', () => {
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

    const xmlString = generateDanovePriznaniXML({
      issuedInvoices: [],
      receivedInvoices: [],
      submitterData,
      year: 2026,
      quarter: 2,
      czkSumEurServices: 0,
      czkSumOutsideEuServices: 628900
    })

    expect(xmlString).toContain('<Veta2 pln_ost="628900" />')
    expect(xmlString).not.toContain('pln_sluzby=')
  })

  it('preserves document-level VAT rounding on both output VAT and input deductions', () => {
    // Each CZK 1.30 document records CZK 0.27 VAT after rounding to haléře.
    // 120 documents therefore record CZK 32.40 VAT, rounded to CZK 32 on
    // the return. Recalculating 156 * 21% produces 32.76 -> CZK 33.
    const issued = Array.from({ length: 120 }, (_, index) =>
      issuedInvoice({
        id: `issued-${index}`,
        subtotal: 1.3,
        total: 1.57,
        native_subtotal: 1.3,
        native_total: 1.57,
        vat_base_21: 1.3,
        vat_21: 0.27
      })
    )
    const received = Array.from({ length: 120 }, (_, index) =>
      receivedInvoice({
        id: `received-${index}`,
        total_without_vat: 1.3,
        total_with_vat: 1.57,
        vat_base_21: 1.3,
        vat_21: 0.27
      })
    )

    const xml = exportInvoices(issued, received)

    expect(xml).toContain('obrat23="156" dan23="32"')
    expect(xml).toContain('pln23="156" odp_tuz23_nar="32"')
    expect(xml).toContain('dan_zocelk="32" odp_zocelk="32" dano_da="0"')
  })

  it('reports 12%-only documents without also adding them to the 21% rows', () => {
    const xml = exportInvoices(
      [
        issuedInvoice({
          subtotal: 320,
          total: 358.4,
          native_subtotal: 320,
          native_total: 358.4,
          vat_base_12: 320,
          vat_12: 38.4
        })
      ],
      [
        receivedInvoice({
          total_without_vat: 160,
          total_with_vat: 179.2,
          vat_base_12: 160,
          vat_12: 19.2
        })
      ]
    )

    expect(xml).toContain('obrat23="0" dan23="0"')
    expect(xml).toContain('obrat5="320" dan5="38"')
    expect(xml).toContain('pln23="0" odp_tuz23_nar="0"')
    expect(xml).toContain('pln5="160" odp_tuz5_nar="19"')
    expect(xml).toContain('dan_zocelk="38" odp_zocelk="19" dano_da="19"')
  })

  it('converts both rates and credit notes to CZK before aggregating', () => {
    const xml = exportInvoices(
      [
        issuedInvoice({
          currency: 'EUR',
          exchange_rate: 25.1,
          subtotal: 1200,
          total: 1434,
          native_subtotal: 30120,
          native_total: 35993.4,
          vat_base_21: 1000,
          vat_21: 210,
          vat_base_12: 200,
          vat_12: 24
        }),
        issuedInvoice({
          currency: 'EUR',
          exchange_rate: 25.1,
          subtotal: -100,
          total: -121,
          native_subtotal: -2510,
          native_total: -3037.1,
          vat_base_21: -100,
          vat_21: -21
        })
      ],
      [
        receivedInvoice({
          currency: 'EUR',
          exchange_rate: 25.1,
          total_without_vat: 500,
          total_with_vat: 596,
          vat_base_21: 400,
          vat_21: 84,
          vat_base_12: 100,
          vat_12: 12
        })
      ]
    )

    expect(xml).toContain('obrat23="22590" dan23="4744"')
    expect(xml).toContain('obrat5="5020" dan5="602"')
    expect(xml).toContain('pln23="10040" odp_tuz23_nar="2108"')
    expect(xml).toContain('pln5="2510" odp_tuz5_nar="301"')
    expect(xml).toContain('dan_zocelk="5346" odp_zocelk="2409" dano_da="2937"')
  })

  it('builds summary rows from the rounded rate rows', () => {
    const xml = exportInvoices(
      [
        issuedInvoice({
          subtotal: 7006.41,
          total: 8207.39,
          native_subtotal: 7006.41,
          native_total: 8207.39,
          vat_base_21: 4002.33,
          vat_21: 840.49,
          vat_base_12: 3004.08,
          vat_12: 360.49
        })
      ],
      [
        receivedInvoice({
          total_without_vat: 2006.41,
          total_with_vat: 2337.39,
          vat_base_21: 1002.33,
          vat_21: 210.49,
          vat_base_12: 1004.08,
          vat_12: 120.49
        })
      ]
    )

    expect(xml).toContain('obrat23="4002" dan23="840"')
    expect(xml).toContain('obrat5="3004" dan5="360"')
    expect(xml).toContain('odp_sum_nar="330"')
    // Rounding the unrounded combined VAT would incorrectly give 1201/331.
    expect(xml).toContain('dan_zocelk="1200" odp_zocelk="330" dano_da="870"')
  })

  it('rounds negative half-crown credit notes symmetrically and exports a refund', () => {
    const xml = exportInvoices(
      [
        issuedInvoice({
          subtotal: -1002.38,
          total: -1212.88,
          native_subtotal: -1002.38,
          native_total: -1212.88,
          vat_base_21: -1002.38,
          vat_21: -210.5
        })
      ],
      [
        receivedInvoice({
          total_without_vat: 100,
          total_with_vat: 112,
          vat_base_12: 100,
          vat_12: 12
        })
      ]
    )

    expect(xml).toContain('obrat23="-1002" dan23="-211"')
    expect(xml).toContain('dan_zocelk="-211" odp_zocelk="12" dano_no="223"')
    expect(xml).not.toContain('dano_da=')
  })

  it('keeps explicit zero VAT and excludes legacy purchases without VAT from deductions', () => {
    const xml = exportInvoices(
      [
        issuedInvoice({
          total: 1000,
          native_total: 1000,
          vat_base_21: 0,
          vat_21: 0,
          vat_base_12: 0,
          vat_12: 0
        })
      ],
      [
        receivedInvoice({ total_without_vat: 1000, total_with_vat: 1000 }),
        receivedInvoice({
          currency: 'EUR',
          exchange_rate: 25,
          total_without_vat: 10,
          total_with_vat: 12.1
        })
      ]
    )

    expect(xml).toContain('obrat23="0" dan23="0"')
    expect(xml).toContain('pln23="250" odp_tuz23_nar="53"')
    expect(xml).toContain('dan_zocelk="0" odp_zocelk="53" dano_no="53"')
  })

  it('includes credit notes, sub-crown VAT and legacy invoices in the download selection', () => {
    const documents = [
      issuedInvoice({ id: 'legacy' }),
      issuedInvoice({
        id: 'credit',
        subtotal: -100,
        total: -112,
        native_subtotal: -100,
        native_total: -112,
        vat_base_12: -100,
        vat_12: -12
      }),
      issuedInvoice({
        id: 'small',
        subtotal: 1.3,
        total: 1.57,
        native_subtotal: 1.3,
        native_total: 1.57,
        vat_base_21: 1.3,
        vat_21: 0.27
      }),
      issuedInvoice({ id: 'untaxed', total: 1000, native_total: 1000 })
    ]
    const taxable = documents.filter(hasIssuedVatAmounts)

    expect(taxable.map((invoice) => invoice.id)).toEqual([
      'legacy',
      'credit',
      'small'
    ])
    const xml = exportInvoices(taxable)
    expect(xml).toContain('obrat23="1001" dan23="210"')
    expect(xml).toContain('obrat5="-100" dan5="-12"')
    expect(xml).toContain('dan_zocelk="198" odp_zocelk="0" dano_da="198"')
  })

  // Restore real timers after tests
  afterAll(() => {
    vi.useRealTimers()
  })
})
