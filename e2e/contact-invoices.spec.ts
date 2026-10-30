import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const contactId = 'client+one/2&3'
const contacts = [
  { id: contactId, name: 'Renamed client' },
  { id: 'other-client', name: 'Other client' },
  { id: 'empty-client', name: 'No invoices' }
]
const contactUrl = (id: string) =>
  `${url}/invoices?${new URLSearchParams({ contactId: id })}`

const invoice = (number: string, clientId = contactId) => ({
  id: `invoice-${number}`,
  number,
  client_contact_id: clientId,
  client_name: 'Original client name',
  client_street: 'Client Street 1',
  client_city: 'Prague',
  client_zip: '11000',
  client_country: 'CZ',
  client_vat_no: null,
  your_name: 'Seller',
  your_street: 'Seller Street 2',
  your_city: 'Prague',
  your_zip: '11000',
  your_country: 'CZ',
  your_registration_no: '12345678',
  your_vat_no: '',
  taxable_fulfillment_due: `${number.slice(0, 4)}-09-01`,
  issued_on: `${number.slice(0, 4)}-09-01`,
  due_on: `${number.slice(0, 4)}-09-15`,
  due_in_days: 14,
  currency: 'CZK',
  language: 'cs',
  exchange_rate: 1,
  bank_account: null,
  iban: null,
  payment_method: 'bank',
  total: 100,
  subtotal: 100,
  native_total: 100,
  native_subtotal: 100,
  paid_on: null,
  sent_at: null,
  items: [{ description: 'Service', quantity: 1, unit_price: 100, vat_rate: 0 }]
})

type ListInput = {
  contactId?: string
  filter?: string
  year?: number | null
  limit: number | null
}

const setup = async (
  page: Page,
  invoices = [
    invoice('2026-001'),
    invoice('2025-001'),
    invoice('2026-002', 'other-client')
  ]
) => {
  const state = { listInputs: [] as ListInput[] }
  await page.clock.setFixedTime(new Date('2026-10-30T08:00:00Z'))
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'contact-invoices-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'contact-invoices-user',
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
    const responses = procedures.map((procedure, index) => {
      const input = inputs[index]?.json
      let json: unknown = null
      if (procedure === 'contacts.all') json = contacts
      if (procedure === 'contacts.byId') {
        json = contacts.find((contact) => contact.id === input) ?? null
      }
      if (procedure === 'invoicingDetails') {
        json = { name: 'Seller', vat_payer: false, bankAccounts: [] }
      }
      if (procedure === 'invoices.getById') {
        json = invoices.find((invoice) => invoice.id === input.id)
      }
      if (procedure === 'invoices.listInvoices') {
        state.listInputs.push(input)
        const matching = invoices.filter(
          (invoice) =>
            (!input.contactId ||
              invoice.client_contact_id === input.contactId) &&
            (!input.year ||
              invoice.taxable_fulfillment_due.startsWith(String(input.year))) &&
            (!input.filter ||
              invoice.number.includes(input.filter) ||
              invoice.client_name.includes(input.filter))
        )
        json = input.limit === null ? matching : matching.slice(0, input.limit)
      }
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(responses)
    })
  })
  return state
}

const invoiceLink = (page: Page, number: string) =>
  page.getByRole('link', { name: number, exact: true })

test('links each contact to all their invoices across years and beyond 100 rows', async ({
  page
}) => {
  const invoices = [
    invoice('2025-001'),
    ...Array.from({ length: 101 }, (_, index) =>
      invoice(`2026-${String(index + 1).padStart(3, '0')}`)
    ),
    invoice('2026-999', 'other-client')
  ]
  const state = await setup(page, invoices)
  await page.goto(`${url}/contacts`)
  for (const contact of contacts) {
    await expect(
      page.getByRole('link', {
        name: `Faktury pro ${contact.name}`,
        exact: true
      })
    ).toHaveAttribute('href', contactUrl(contact.id).slice(url.length))
  }
  await page.getByRole('link', { name: 'Faktury pro Renamed client' }).click()
  await expect(page).toHaveURL(contactUrl(contactId))
  await expect(page.getByText('Renamed client', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveText('Všechny')
  await expect(invoiceLink(page, '2025-001')).toBeVisible()
  await expect(invoiceLink(page, '2026-101')).toBeVisible()
  await expect(invoiceLink(page, '2026-999')).toHaveCount(0)
  expect(state.listInputs.at(-1)).toEqual({
    contactId,
    year: null,
    filter: '',
    limit: null
  })

  await page.reload()
  await expect(invoiceLink(page, '2025-001')).toBeVisible()
  await expect(invoiceLink(page, '2026-101')).toBeVisible()
  await expect(invoiceLink(page, '2026-999')).toHaveCount(0)
})

test('retains the contact when changing year and search, reloading and exporting', async ({
  page
}) => {
  const state = await setup(page)
  await page.goto(`${contactUrl(contactId)}&year=2026&search=001`)
  await expect(page.getByRole('combobox')).toHaveText('2026')
  const search = page.getByPlaceholder(
    'Hledat faktury podle jména klienta, IČO, DIČ nebo čísla faktury'
  )
  await expect(search).toHaveValue('001')
  await expect(invoiceLink(page, '2026-001')).toBeVisible()
  await expect(invoiceLink(page, '2025-001')).toHaveCount(0)
  await search.fill('Original')
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Všechny', exact: true }).click()
  await expect(invoiceLink(page, '2025-001')).toBeVisible()
  await page.reload()
  await expect(search).toHaveValue('Original')
  await expect(page.getByRole('combobox')).toHaveText('Všechny')
  await expect(invoiceLink(page, '2026-002')).toHaveCount(0)

  await page.getByRole('button', { name: 'Stáhnout', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'CSV', exact: true }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('2026-001')
  expect(csv).toContain('2025-001')
  expect(csv).not.toContain('2026-002')
  expect(state.listInputs.at(-1)).toEqual({
    contactId,
    year: null,
    filter: 'Original',
    limit: null
  })

  await page.getByRole('button', { name: 'Zrušit filtr kontaktu' }).click()
  expect(new URL(page.url()).searchParams.has('contactId')).toBe(false)
  expect(new URL(page.url()).searchParams.get('search')).toBe('Original')
  expect(new URL(page.url()).searchParams.get('year')).toBe('all')
  await expect(invoiceLink(page, '2026-002')).toBeVisible()
})

test('downloads a combined PDF containing only the selected contact’s invoices', async ({
  page
}) => {
  test.setTimeout(60000)
  const state = await setup(page)
  await page.goto(contactUrl(contactId))
  await page.getByRole('button', { name: 'Stáhnout', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'PDF – všechny faktury' }).click()
  const download = await downloadPromise
  const require = createRequire(resolve('faktorio-fe/package.json'))
  const { getDocument } = await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  )
  const loadingTask = getDocument({
    data: new Uint8Array(await readFile((await download.path())!))
  })
  try {
    const pdf = await loadingTask.promise
    expect(pdf.numPages).toBe(2)
    for (const [index, number] of ['2026-001', '2025-001'].entries()) {
      const content = await (await pdf.getPage(index + 1)).getTextContent()
      const text = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ')
      expect(text).toContain(`Faktura ${number}`)
      expect(text).not.toContain('2026-002')
    }
  } finally {
    await loadingTask.destroy()
  }
  expect(state.listInputs.at(-1)?.contactId).toBe(contactId)
})

test('follows URL query changes and browser back without stale contact or search filters', async ({
  page
}) => {
  await setup(page)
  await page.goto(contactUrl(contactId))
  await expect(invoiceLink(page, '2025-001')).toBeVisible()
  await page.evaluate(() => {
    history.pushState(
      null,
      '',
      '/invoices?contactId=other-client&year=all&search=002'
    )
  })
  await expect(invoiceLink(page, '2026-002')).toBeVisible()
  await expect(invoiceLink(page, '2025-001')).toHaveCount(0)
  await expect(page.getByText('Other client', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('002')

  await page.goBack()
  await expect(page).toHaveURL(contactUrl(contactId))
  await expect(page.getByRole('textbox')).toHaveValue('')
  await expect(invoiceLink(page, '2025-001')).toBeVisible()
  await expect(invoiceLink(page, '2026-002')).toHaveCount(0)
})

test('shows an empty list for a contact without invoices', async ({ page }) => {
  await setup(page)
  await page.goto(`${url}/contacts`)
  await page.getByRole('link', { name: 'Faktury pro No invoices' }).click()
  await expect(page.getByText('No invoices', { exact: true })).toBeVisible()
  await expect(page.getByText('Žádné faktury k zobrazení.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Stáhnout', exact: true })
  ).toBeDisabled()
})
