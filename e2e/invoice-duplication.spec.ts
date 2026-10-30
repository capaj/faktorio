import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const euroBankDetails = {
  bank_account: '222222/0800',
  iban: 'CZ6508000000000000222222',
  swift_bic: 'GIBACZPX'
}
const sourceInvoice = {
  id: 'source-invoice',
  number: '2026-001',
  currency: 'EUR',
  language: 'en',
  your_name: 'Seller',
  your_street: 'Street 1',
  your_city: 'Prague',
  your_zip: '11000',
  your_country: 'CZ',
  your_registration_no: '12345678',
  your_vat_no: '',
  client_name: 'Client',
  client_street: 'Street 2',
  client_city: 'Prague',
  client_zip: '11000',
  client_country: 'CZ',
  client_contact_id: 'client',
  issued_on: '2026-09-01',
  taxable_fulfillment_due: '2026-09-01',
  due_on: '2026-09-15',
  due_in_days: 14,
  exchange_rate: 25,
  payment_method: 'bank',
  ...euroBankDetails,
  subtotal: 100,
  total: 100,
  native_subtotal: 2500,
  native_total: 2500,
  items: [
    {
      id: 1,
      description: 'Consulting',
      quantity: 1,
      unit_price: 100,
      unit: 'hour',
      vat_rate: 0,
      order: 0
    }
  ]
}

const setup = async (page: Page, bankDetails = euroBankDetails) => {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'invoice-duplication-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'owner',
        name: 'Seller',
        email: 'seller@example.test'
      })
    )
  })
  await page.route('**/trpc/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const procedures = requestUrl.pathname.split('/trpc/')[1].split(',')
    const response = procedures.map((procedure) => {
      let json: unknown = null
      if (procedure === 'invoicingDetails')
        json = {
          name: 'Seller',
          registration_no: '12345678',
          vat_payer: false,
          bankAccounts: [
            {
              id: 'default',
              label: 'Default account',
              is_default: true,
              bank_account: '111111/0100',
              iban: 'CZ6501000000000000111111',
              swift_bic: 'KOMBCZPP'
            },
            { id: 'euro', label: 'Euro account', ...euroBankDetails }
          ]
        }
      if (procedure === 'contacts.all')
        json = [
          {
            id: 'client',
            name: 'Client',
            language: 'cs',
            currency: 'CZK',
            created_at: '2025-01-01 12:00:00'
          }
        ]
      if (procedure === 'invoices.getById')
        json = { ...sourceInvoice, ...bankDetails }
      if (procedure === 'invoices.lastInvoiceThisYear')
        json = { number: sourceInvoice.number }
      if (procedure === 'invoices.lastInvoice') json = sourceInvoice
      if (procedure === 'invoices.listInvoices') json = [sourceInvoice]
      if (procedure === 'invoices.listShares') json = []
      if (procedure === 'invoices.getExchangeRate') json = 24.5
      if (procedure === 'invoices.create') json = sourceInvoice.id
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

const expectDuplicate = async (
  page: Page,
  bankDetails: typeof euroBankDetails,
  selectedAccount: string
) => {
  await expect(
    page.getByRole('combobox').filter({ hasText: 'EUR' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Bankovní údaje' }).click()
  await expect(
    page.getByRole('combobox').filter({ hasText: selectedAccount })
  ).toBeVisible()
  await expect(page.getByLabel('Číslo účtu', { exact: true })).toHaveValue(
    bankDetails.bank_account
  )
  await expect(page.getByLabel('IBAN', { exact: true })).toHaveValue(
    bankDetails.iban
  )
  await expect(page.getByLabel('SWIFT/BIC', { exact: true })).toHaveValue(
    bankDetails.swift_bic
  )
  const submitted = page.waitForRequest((request) =>
    request.url().includes('/trpc/invoices.create')
  )
  await page.getByRole('button', { name: 'Vytvořit fakturu' }).click()
  expect((await submitted).postDataJSON()['0'].json.invoice).toMatchObject({
    currency: 'EUR',
    language: 'en',
    client_contact_id: 'client',
    ...bankDetails
  })
}

test('duplicates a cached invoice with its currency and non-default bank account', async ({
  page
}) => {
  await setup(page)
  await page.goto(`${url}/invoices/${sourceInvoice.id}`)
  await page.getByRole('button', { name: 'Duplikovat', exact: true }).click()
  await expectDuplicate(page, euroBankDetails, 'Euro account')
})

test('duplicates an uncached invoice with its currency and custom bank details', async ({
  page
}) => {
  const bankDetails = {
    bank_account: '333333/0300',
    iban: 'CZ6503000000000000333333',
    swift_bic: 'CEKOCZPP'
  }
  await setup(page, bankDetails)
  await page.goto(`${url}/new-invoice?duplicateFrom=${sourceInvoice.id}`)
  await expectDuplicate(page, bankDetails, 'Vlastní údaje')
})

test('keeps empty bank details when duplicating an invoice', async ({
  page
}) => {
  const bankDetails = { bank_account: '', iban: '', swift_bic: '' }
  await setup(page, bankDetails)
  await page.goto(`${url}/new-invoice?duplicateFrom=${sourceInvoice.id}`)
  await expectDuplicate(page, bankDetails, 'Vlastní údaje')
})

test('waits for the source invoice before allowing it to be duplicated', async ({
  page
}) => {
  await setup(page)
  // Warm the form's defaults, then duplicate an invoice that is not cached.
  await page.goto(`${url}/new-invoice`)
  await expect(page.getByTestId('contact-combobox')).toContainText('Client')
  await page.getByRole('link', { name: 'Vystavené', exact: true }).click()

  let releaseSource!: () => void
  const sourceReady = new Promise<void>((resolve) => {
    releaseSource = resolve
  })
  await page.route('**/trpc/**', async (route) => {
    if (route.request().url().includes('invoices.getById')) await sourceReady
    await route.fallback()
  })
  const sourceRequested = page.waitForRequest((request) =>
    request.url().includes('invoices.getById')
  )
  try {
    await page
      .getByRole('row')
      .filter({ hasText: sourceInvoice.number })
      .getByRole('button')
      .last()
      .click()
    await sourceRequested
    await page.getByRole('link', { name: 'Duplikovat', exact: true }).click()
    await expect(page).toHaveURL(/new-invoice\?duplicateFrom=source-invoice/)
    await expect(
      page.getByRole('button', { name: 'Vytvořit fakturu' })
    ).toHaveCount(0)
  } finally {
    releaseSource()
  }
  await expectDuplicate(page, euroBankDetails, 'Euro account')
})
