import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

const contact = {
  id: 'czech-client',
  name: 'Czech Client s.r.o.',
  vat_no: 'CZ87654321',
  currency: 'CZK',
  language: 'cs'
}
const invoice = {
  id: 'invoice-1',
  number: '2026-007',
  currency: 'CZK',
  issued_on: '2026-10-01',
  taxable_fulfillment_due: '2026-10-01',
  due_on: '2026-10-15',
  client_contact_id: contact.id,
  client_name: contact.name,
  subtotal: 125000,
  total: 151250,
  paid_on: null
}

const setupSignedIn = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'theme-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'theme-test-user',
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
        json = { name: 'Seller', vat_payer: true, bankAccounts: [] }
      }
      if (procedure === 'contacts.all') json = [contact]
      if (procedure === 'invoices.listInvoices') {
        json = [
          invoice,
          {
            ...invoice,
            id: 'invoice-2',
            number: '2026-006',
            paid_on: '2026-09-20',
            subtotal: 50000,
            total: 60500
          }
        ]
      }
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

const html = (page: Page) => page.locator('html')

test('theme follows the system by default and remembers a manual choice', async ({
  page
}, testInfo) => {
  // A fixed date keeps the payment badges in the documentation screenshot stable
  await page.clock.setFixedTime(new Date('2026-10-10T10:00:00+02:00'))
  await setupSignedIn(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(`${url}/invoices`)
  await expect(
    page.getByRole('cell', { name: '2026-007', exact: true })
  ).toBeVisible()
  await expect(html(page)).toHaveClass(/\bdark\b/)

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html(page)).toHaveClass(/\bdark\b/)

  const toggle = page.getByRole('button', { name: 'Motiv vzhledu' })
  await toggle.click()
  const menu = page.getByRole('menu')
  await expect(
    menu.getByRole('menuitemradio', { name: 'Podle systému' })
  ).toHaveAttribute('aria-checked', 'true')

  if (testInfo.project.metadata.documentationScreenshots) {
    const directory = resolve('docs/screenshots')
    await mkdir(directory, { recursive: true })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: resolve(directory, 'invoice-list-dark.png'),
      clip: { x: 0, y: 0, width: 1440, height: 420 },
      animations: 'disabled',
      caret: 'hide'
    })
  }

  await menu.getByRole('menuitemradio', { name: 'Světlý' }).click()
  await expect(html(page)).not.toHaveClass(/\bdark\b/)

  await page.reload()
  await expect(
    page.getByRole('cell', { name: '2026-007', exact: true })
  ).toBeVisible()
  await expect(html(page)).not.toHaveClass(/\bdark\b/)

  await toggle.click()
  await page
    .getByRole('menu')
    .getByRole('menuitemradio', { name: 'Podle systému' })
    .click()
  await expect(html(page)).toHaveClass(/\bdark\b/)
})

test('stored theme is applied before the app bundle runs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await page.emulateMedia({ colorScheme: 'light' })
  // Never deliver the app, so only the inline script in index.html can set the theme
  await page.route(/\/src\/main\.tsx/, () => {})
  await page.goto(`${url}/login`, { waitUntil: 'commit' })
  await expect(html(page)).toHaveClass(/\bdark\b/)
  await expect(page.locator('#root')).toBeEmpty()
})
