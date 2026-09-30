import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useState: vi.fn()
}))
const qrCodeMocks = vi.hoisted(() => ({
  useQRCodeBase64: vi.fn((payload: string | null) =>
    payload ? 'data:image/png;base64,generated-qr-code' : ''
  )
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()

  return {
    ...actual,
    useEffect: reactMocks.useEffect,
    useState: reactMocks.useState
  }
})

vi.mock('wouter', () => ({
  useParams: () => ({ shareId: 'share-with-bank-account' })
}))

vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: () => null
}))

vi.mock('./InvoiceDetail/CzechInvoicePDF', () => ({
  CzechInvoicePDF: () => null
}))

vi.mock('./InvoiceDetail/EnglishInvoicePDF', () => ({
  EnglishInvoicePDF: () => null
}))

vi.mock('./InvoiceDetail/InvoicePdfPreview', () => ({
  InvoicePdfPreview: () => null
}))

vi.mock('lucide-react', () => ({
  Download: () => null
}))

vi.mock('@/components/ui/button', () => ({
  Button: () => null
}))

vi.mock('@/lib/isdoc/generateIsdocXml', () => ({
  generateIsdocXml: vi.fn()
}))

vi.mock('@/lib/trpcClient', () => ({
  trpcClient: {
    sharedInvoiceEvent: {
      useMutation: () => ({ mutate: vi.fn() })
    }
  }
}))

vi.mock('@/lib/useQRCodeBase64', () => ({
  useQRCodeBase64: qrCodeMocks.useQRCodeBase64
}))

import { SharedInvoicePage } from './SharedInvoicePage'
import { CzechInvoicePDF } from './InvoiceDetail/CzechInvoicePDF'
import { EnglishInvoicePDF } from './InvoiceDetail/EnglishInvoicePDF'
import { InvoicePdfPreview } from './InvoiceDetail/InvoicePdfPreview'
import { PDFDownloadLink } from '@react-pdf/renderer'

const sharedInvoice = {
  invoice: {
    id: 'invoice-with-bank-account',
    number: '2026-001',
    your_name: 'QR Test s.r.o.',
    iban: 'CZ2806000000000000000123',
    currency: 'CZK'
  },
  items: [{ quantity: 1, unit_price: 1_000, vat_rate: 0 }],
  vatPayer: false,
  logoUrl: null
}

function findElementByType(
  node: ReactNode,
  type: ReactElement['type']
): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement(node)) return undefined

  const element = node as ReactElement<Record<string, unknown>>
  if (element.type === type) return element

  for (const child of Children.toArray(element.props.children as ReactNode)) {
    const match = findElementByType(child, type)
    if (match) return match
  }

  return undefined
}

describe('SharedInvoicePage QR payment preview', () => {
  beforeEach(() => {
    reactMocks.useEffect.mockReset()
    reactMocks.useState.mockReset()
    qrCodeMocks.useQRCodeBase64.mockClear()
    reactMocks.useState
      .mockReturnValueOnce([false, vi.fn()])
      .mockReturnValueOnce([null, vi.fn()])
      .mockReturnValueOnce([sharedInvoice, vi.fn()])
      .mockReturnValueOnce([null, vi.fn()])
  })

  it('passes a generated QR code to the PDF shown on the public share link', () => {
    const page = SharedInvoicePage()
    const preview = findElementByType(page, InvoicePdfPreview)

    expect(preview).toBeDefined()

    const pdfDocument = preview?.props.document
    expect(isValidElement(pdfDocument)).toBe(true)

    const pdfElement = pdfDocument as ReactElement<{
      qrCodeBase64?: string
    }>

    expect(qrCodeMocks.useQRCodeBase64).toHaveBeenCalledWith(
      'SPD*1.0*ACC:CZ2806000000000000000123*AM:1000.00*CC:CZK*MSG:Faktura 2026-001*X-VS:2026001'
    )
    expect(pdfElement.type).toBe(CzechInvoicePDF)
    expect(pdfElement.props.qrCodeBase64).toMatch(/^data:image\/png;base64,/)
  })

  it.each([
    ['en', null, EnglishInvoicePDF, 'en'],
    ['cs', null, CzechInvoicePDF, 'cs'],
    ['en', 'cs', CzechInvoicePDF, 'cs'],
    ['cs', 'en', EnglishInvoicePDF, 'en']
  ])(
    'uses invoice language %s with selection %s for preview and download',
    (invoiceLanguage, selectedLanguage, expectedPdf, expectedLanguage) => {
      reactMocks.useState.mockReset()
      reactMocks.useState
        .mockReturnValueOnce([false, vi.fn()])
        .mockReturnValueOnce([null, vi.fn()])
        .mockReturnValueOnce([
          {
            ...sharedInvoice,
            invoice: { ...sharedInvoice.invoice, language: invoiceLanguage }
          },
          vi.fn()
        ])
        .mockReturnValueOnce([selectedLanguage, vi.fn()])

      const page = SharedInvoicePage()
      const preview = findElementByType(page, InvoicePdfPreview)
      const download = findElementByType(page, PDFDownloadLink)

      expect((preview?.props.document as ReactElement).type).toBe(expectedPdf)
      expect((download?.props.document as ReactElement).type).toBe(expectedPdf)
      expect(findElementByType(page, 'select')?.props.value).toBe(expectedLanguage)
    }
  )
})
