import { expect, test } from './fixtures'
import type { Download, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const pdfRequire = createRequire(resolve('faktorio-fe/package.json'))
const pdfjsPromise = import(
  pathToFileURL(pdfRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
)
const { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } =
  pdfRequire('@zip.js/zip.js')
const Papa = pdfRequire('papaparse')

const createInvoice = (index: number, language = 'cs', itemCount = 1) => ({
  id: `bulk-invoice-${index}`,
  number: `2026-${String(index).padStart(3, '0')}`,
  language,
  your_name: 'Seller',
  your_street: 'Street 1',
  your_city: 'Prague',
  your_zip: '11000',
  your_country: 'CZ',
  your_registration_no: '12345678',
  your_vat_no: '',
  client_name: 'Bulk Client',
  client_street: 'Street 2',
  client_city: 'Prague',
  client_zip: '11000',
  client_country: 'CZ',
  client_vat_no: null,
  issued_on: '2026-09-01',
  taxable_fulfillment_due: '2026-09-01',
  due_on: '2026-09-15',
  due_in_days: 14,
  exchange_rate: 1,
  payment_method: 'bank',
  bank_account: '123456789/0100',
  iban: null,
  swift_bic: null,
  currency: 'CZK',
  total: itemCount * 100,
  subtotal: itemCount * 100,
  native_total: itemCount * 100,
  native_subtotal: itemCount * 100,
  paid_on: null,
  sent_at: null,
  status: null,
  cancelled_at: null,
  footer_note: `Footer for invoice ${index}`,
  items: Array.from({ length: itemCount }, (_, itemIndex) => ({
    id: itemIndex + 1,
    description: `Service ${index} item ${itemIndex + 1}`,
    quantity: 1,
    unit_price: 100,
    vat_rate: 0,
    unit: 'ks',
    order: itemIndex
  }))
})

type Invoice = ReturnType<typeof createInvoice>

const setup = async (page: Page, invoices: Invoice[]) => {
  const state = {
    listInputs: [] as {
      limit: number | null
      filter?: string
      year?: number | null
    }[],
    detailIds: [] as string[],
    failDetails: false,
    detailDelayMs: 0
  }
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'))
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'bulk-download-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'bulk-download-user',
        name: 'Seller',
        email: 'seller@example.test'
      })
    )
  })
  await page.route('**/trpc/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const procedures = requestUrl.pathname.split('/trpc/')[1].split(',')
    const inputs = JSON.parse(
      route.request().postData() || requestUrl.searchParams.get('input') || '{}'
    )
    const response = procedures.map((procedure, index) => {
      let json: unknown = null
      if (procedure === 'invoicingDetails') {
        json = { name: 'Seller', vat_payer: false, bankAccounts: [] }
      }
      if (procedure === 'invoices.listInvoices') {
        const input = inputs[index].json
        state.listInputs.push(input)
        const matching = invoices.filter(
          (invoice) =>
            (!input.filter || invoice.client_name.includes(input.filter)) &&
            (!input.year ||
              invoice.taxable_fulfillment_due.startsWith(String(input.year)))
        )
        json = input.limit === null ? matching : matching.slice(0, input.limit)
      }
      if (procedure === 'invoices.getById') {
        const id = inputs[index].json.id
        state.detailIds.push(id)
        if (state.failDetails) {
          return {
            error: {
              json: {
                message: 'Invoice unavailable',
                code: -32603,
                data: {
                  code: 'INTERNAL_SERVER_ERROR',
                  httpStatus: 500,
                  path: procedure
                }
              }
            }
          }
        }
        json = invoices.find((invoice) => invoice.id === id)
      }
      return { result: { data: { json } } }
    })
    if (state.detailDelayMs && procedures.includes('invoices.getById')) {
      await new Promise((resolve) => setTimeout(resolve, state.detailDelayMs))
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
  return state
}

const downloadPdf = async (page: Page) => {
  await page.getByRole('button', { name: 'Stáhnout', exact: true }).click()
  const download = page.waitForEvent('download', { timeout: 60000 })
  await page
    .getByRole('menuitem', { name: 'PDF – všechny faktury', exact: true })
    .click()
  return download
}

const readPdf = async (download: Download) => {
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  const filePath = await download.path()
  expect(filePath).not.toBeNull()
  return readPdfData(new Uint8Array(await readFile(filePath!)))
}

const readPdfData = async (data: Uint8Array) => {
  const pdfjs = await pdfjsPromise
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true
  })
  const document = await loadingTask.promise
  try {
    return await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1)
        const content = await page.getTextContent()
        return {
          text: content.items
            .filter((item: { str?: string }) => typeof item.str === 'string')
            .map((item: { str: string }) => item.str)
            .join(' '),
          height: page.view[3] - page.view[1]
        }
      })
    )
  } finally {
    await loadingTask.destroy()
  }
}

test('downloads filtered Czech and English invoices with complete long invoices on one page each', async ({
  page
}, testInfo) => {
  test.setTimeout(60000)
  const excludedYear = {
    ...createInvoice(3),
    taxable_fulfillment_due: '2025-09-01'
  }
  const excludedClient = { ...createInvoice(4), client_name: 'Other client' }
  const state = await setup(page, [
    createInvoice(1),
    createInvoice(2, 'en', 40),
    excludedYear,
    excludedClient
  ])
  await page.goto(`${url}/invoices?search=Bulk`)
  const download = await downloadPdf(page)
  await download.saveAs(testInfo.outputPath('bulk-invoices.pdf'))
  const pages = await readPdf(download)

  expect(pages).toHaveLength(2)
  expect(pages[0].text).toContain('Faktura 2026-001')
  expect(pages[0].text).toContain('Service 1 item 1')
  expect(pages[0].height).toBeCloseTo(841.89, 0)
  expect(pages[1].text).toContain('Invoice 2026-002')
  expect(pages[1].text).toContain('Service 2 item 40')
  expect(pages[1].text).toContain('Footer for invoice 2')
  expect(state.detailIds).toEqual(['bulk-invoice-1', 'bulk-invoice-2'])
  expect(state.listInputs).toContainEqual({
    filter: 'Bulk',
    limit: null,
    year: 2026
  })
})

test('exports invoices beyond the first 100 displayed rows', async ({
  page
}) => {
  test.setTimeout(120000)
  const invoices = Array.from({ length: 101 }, (_, index) =>
    createInvoice(index + 1)
  )
  const state = await setup(page, invoices)
  await page.goto(`${url}/invoices`)
  const pages = await readPdf(await downloadPdf(page))

  expect(pages).toHaveLength(101)
  expect(pages[0].text).toContain('Faktura 2026-001')
  expect(pages[100].text).toContain('Faktura 2026-101')
  expect(state.detailIds).toEqual(invoices.map((invoice) => invoice.id))
  expect(state.listInputs.some((input) => input.limit === null)).toBe(true)
})

test('disables downloads when the invoice list is empty', async ({ page }) => {
  await setup(page, [])
  await page.goto(`${url}/invoices`)
  await expect(page.getByText('Žádné faktury k zobrazení.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Stáhnout', exact: true })
  ).toBeDisabled()
})

test('allows retrying after generation fails without downloading a partial PDF', async ({
  page
}) => {
  test.setTimeout(60000)
  const state = await setup(page, [createInvoice(1), createInvoice(2, 'en')])
  state.failDetails = true
  state.detailDelayMs = 500
  const downloads: Download[] = []
  page.on('download', (download) => downloads.push(download))
  page.on('dialog', (dialog) => dialog.dismiss())
  await page.goto(`${url}/invoices`)
  const button = page.getByRole('button', { name: 'Stáhnout', exact: true })
  await button.click()
  await page
    .getByRole('menuitem', { name: 'PDF – všechny faktury', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Generuji...', exact: true })
  ).toBeDisabled()
  await expect.poll(() => state.detailIds.length).toBeGreaterThan(0)
  await expect(page.getByText('Chyba při generování PDF souboru')).toBeVisible()
  await expect(button).toBeEnabled({ timeout: 30000 })
  expect(downloads).toHaveLength(0)

  state.failDetails = false
  state.detailDelayMs = 0
  const pages = await readPdf(await downloadPdf(page))
  expect(pages).toHaveLength(2)
  expect(downloads).toHaveLength(1)
})

test('keeps CSV downloads working across all years', async ({ page }) => {
  const state = await setup(page, [
    createInvoice(1),
    { ...createInvoice(2, 'en'), taxable_fulfillment_due: '2025-09-01' }
  ])
  await page.goto(`${url}/invoices?search=Bulk`)
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Všechny', exact: true }).click()
  await expect
    .poll(() => state.listInputs.some((input) => input.year === null))
    .toBe(true)
  await page.getByRole('button', { name: 'Stáhnout', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'CSV', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('invoices_2026-002_2026-001.csv')
  const csv = Papa.parse(await readFile((await download.path())!, 'utf8'), {
    header: true,
    skipEmptyLines: true
  })
  expect(csv.errors).toEqual([])
  expect(
    csv.data.map((invoice: Invoice) => [invoice.number, invoice.language])
  ).toEqual([
    ['2026-001', 'cs'],
    ['2026-002', 'en']
  ])
  expect(state.listInputs).toContainEqual({
    filter: 'Bulk',
    year: null,
    limit: null
  })
  expect(state.detailIds).toEqual([])
})

test('keeps ZIP downloads working with individual Czech and English PDFs', async ({
  page
}) => {
  test.setTimeout(60000)
  await setup(page, [createInvoice(1), createInvoice(2, 'en')])
  await page.goto(`${url}/invoices`)
  await page.getByRole('button', { name: 'Stáhnout', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'ZIP', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('invoices_2026-002_2026-001.zip')
  const zip = new ZipReader(
    new Uint8ArrayReader(
      new Uint8Array(await readFile((await download.path())!))
    )
  )
  try {
    const entries = await zip.getEntries()
    expect(
      entries.map((entry: { filename: string }) => entry.filename)
    ).toEqual(['seller-2026-001.pdf', 'seller-2026-002.pdf'])
    for (const [index, heading] of [
      'Faktura 2026-001',
      'Invoice 2026-002'
    ].entries()) {
      const data = await entries[index].getData(new Uint8ArrayWriter(), {
        useWebWorkers: false
      })
      const pages = await readPdfData(data)
      expect(pages).toHaveLength(1)
      expect(pages[0].text).toContain(heading)
      expect(pages[0].text).toContain(`Service ${index + 1} item 1`)
      expect(pages[0].height).toBeCloseTo(841.89, 0)
    }
  } finally {
    await zip.close()
  }
})

test('keeps standalone Czech and English invoice previews and downloads working', async ({
  page
}) => {
  test.setTimeout(60000)
  await setup(page, [createInvoice(1), createInvoice(2, 'en')])
  for (const [index, heading] of [
    'Faktura 2026-001',
    'Invoice 2026-002'
  ].entries()) {
    await page.goto(`${url}/invoices/bulk-invoice-${index + 1}`)
    const canvas = page.getByLabel('PDF page 1', { exact: true })
    await expect(canvas).toBeVisible()
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          if (element.width < 500 || element.height < 700) return 0
          const pixels = element
            .getContext('2d')!
            .getImageData(0, 0, element.width, element.height).data
          let darkPixels = 0
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (
              pixels[offset + 3] > 0 &&
              pixels[offset] < 200 &&
              pixels[offset + 1] < 200 &&
              pixels[offset + 2] < 200
            )
              darkPixels++
          }
          return darkPixels
        })
      )
      .toBeGreaterThan(100)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'PDF', exact: true }).click()
    const pages = await readPdf(await downloadPromise)
    expect(pages).toHaveLength(1)
    expect(pages[0].text).toContain(heading)
    expect(pages[0].height).toBeCloseTo(841.89, 0)
  }
})
