import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

const setupInvoice = async (page: Page, vatPayer: boolean) => {
  const state = { vatPayer, invoicingDetailsRequests: 0 }
  const sourceInvoice = {
    id: 'source-invoice',
    number: '2026-001',
    currency: 'CZK',
    language: 'cs',
    issued_on: '2026-09-01',
    taxable_fulfillment_due: '2026-09-01',
    due_on: '2026-09-15',
    payment_method: 'bank',
    due_in_days: 14,
    client_contact_id: 'czech-client',
    exchange_rate: 1,
    items: [
      {
        description: 'Consulting',
        unit: 'manday',
        quantity: 1,
        unit_price: 1000,
        vat_rate: 21
      },
      {
        description: 'Second item',
        unit: 'ks',
        quantity: 1,
        unit_price: 500,
        vat_rate: 12
      }
    ]
  }

  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'invoice-vat-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'invoice-vat-test-user',
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
      if (procedure === 'invoicingDetails') {
        state.invoicingDetailsRequests++
        json = {
          name: 'Seller',
          registration_no: '12345678',
          vat_payer: state.vatPayer,
          bankAccounts: []
        }
      }
      if (procedure === 'contacts.all') {
        json = [
          {
            id: 'czech-client',
            name: 'Czech Client',
            vat_no: 'CZ87654321',
            currency: 'CZK',
            language: 'cs'
          }
        ]
      }
      if (procedure === 'invoices.getById') json = sourceInvoice
      if (procedure === 'invoices.create') json = 'created-invoice'
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })

  return state
}

const submitInvoice = async (page: Page) => {
  const requestPromise = page.waitForRequest((request) =>
    request.url().includes('/trpc/invoices.create')
  )
  await page.getByRole('button', { name: 'Vytvořit fakturu' }).click()
  return (await requestPromise).postDataJSON()['0'].json as {
    items: { vat_rate: number }[]
  }
}

test('non-VAT payers create invoices with zero VAT for initial and added items', async ({
  page
}) => {
  await setupInvoice(page, false)
  await page.goto(`${url}/new-invoice`)
  await expect(page.getByTestId('contact-combobox')).toContainText(
    'Czech Client'
  )
  await expect(page.getByLabel('DPH %', { exact: true })).toHaveCount(0)
  await page.getByLabel('Popis položky', { exact: true }).fill('Consulting')
  await page.getByLabel('Cena/jedn.', { exact: true }).fill('1000')
  await page.getByRole('button', { name: 'Další položka' }).click()
  await page.getByLabel('Popis položky', { exact: true }).nth(1).fill('Support')
  await page.getByLabel('Cena/jedn.', { exact: true }).nth(1).fill('500')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const submitted = await submitInvoice(page)
  expect(submitted.items.map((item) => item.vat_rate)).toEqual([0, 0])
})

test('non-VAT payers duplicate invoices without retaining the old VAT rates', async ({
  page
}) => {
  await setupInvoice(page, false)
  await page.goto(`${url}/new-invoice?duplicateFrom=source-invoice`)
  await expect(page.getByLabel('Popis položky', { exact: true })).toHaveCount(2)
  await expect(page.getByLabel('DPH %', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const submitted = await submitInvoice(page)
  expect(submitted.items.map((item) => item.vat_rate)).toEqual([0, 0])
})

test('VAT payers keep the zero-VAT warning and can confirm it once per item', async ({
  page
}) => {
  await setupInvoice(page, true)
  await page.goto(`${url}/new-invoice`)
  await expect(page.getByTestId('contact-combobox')).toContainText(
    'Czech Client'
  )
  const vatRate = page.getByLabel('DPH %', { exact: true })
  await expect(vatRate).toHaveValue('21')
  await vatRate.fill('0')
  await expect(page.getByRole('dialog', { name: 'Upozornění' })).toBeVisible()
  await page
    .getByRole('button', { name: 'Rozumím, pokračovat s 0% DPH' })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(vatRate).toHaveValue('0')
  await vatRate.fill('21')
  await vatRate.fill('0')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('switching to non-VAT payer closes an open warning and clears all VAT rates', async ({
  page
}) => {
  const state = await setupInvoice(page, true)
  await page.goto(`${url}/new-invoice?duplicateFrom=source-invoice`)
  await expect(page.getByLabel('DPH %', { exact: true })).toHaveCount(2)
  await page.getByLabel('DPH %', { exact: true }).first().fill('0')
  await expect(page.getByRole('dialog', { name: 'Upozornění' })).toBeVisible()

  state.vatPayer = false
  const previousRequests = state.invoicingDetailsRequests
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.dispatchEvent(new Event('visibilitychange'))
      )
      return state.invoicingDetailsRequests
    })
    .toBeGreaterThan(previousRequests)
  await expect(page.getByLabel('DPH %', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const submitted = await submitInvoice(page)
  expect(submitted.items.map((item) => item.vat_rate)).toEqual([0, 0])
})
