import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

const url = 'http://localhost:5173'
const sourceInvoice = {
  id: 'template-source',
  number: '2025-099',
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
  issued_on: '2025-01-01',
  taxable_fulfillment_due: '2024-12-31',
  due_on: '2025-01-31',
  due_in_days: 30,
  exchange_rate: 25,
  payment_method: 'bank',
  bank_account: null,
  iban: 'CZ6508000000192000145399',
  swift_bic: null,
  footer_note: 'Original note',
  total: 300,
  paid_on: null,
  status: null,
  cancelled_at: null,
  items: [
    {
      id: 99,
      description: 'Original service',
      quantity: 2,
      unit_price: 100,
      unit: 'hour',
      vat_rate: 0,
      order: 0
    },
    {
      id: 100,
      description: 'Support',
      quantity: 1,
      unit_price: 100,
      unit: 'ks',
      vat_rate: 0,
      order: 1
    }
  ]
}
const initialTemplate = {
  id: 'monthly',
  name: 'Monthly services',
  created_at: '2025-01-01 12:00:00',
  data: {
    invoice: {
      currency: 'EUR',
      language: 'en',
      due_in_days: 30,
      client_contact_id: 'client',
      payment_method: 'bank',
      footer_note: 'Issued {{date}}',
      bank_account: null,
      iban: sourceInvoice.iban,
      swift_bic: null
    },
    items: sourceInvoice.items.map((item, index) => ({
      ...item,
      order: index,
      description:
        index === 0
          ? 'Services {{previousMonth}} / {{month}}'
          : item.description
    }))
  }
}

const setup = async (page: Page) => {
  const state = {
    templates: [structuredClone(initialTemplate)],
    failList: false,
    saves: [] as (typeof initialTemplate)['data'][],
    creates: [] as {
      invoice: Record<string, unknown>
      items: Record<string, unknown>[]
    }[]
  }
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'))
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'template-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'template-user',
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
      if (procedure === 'invoicingDetails')
        json = {
          name: 'Seller',
          registration_no: '12345678',
          vat_payer: false,
          bankAccounts: []
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
      if (procedure === 'invoices.getById') json = sourceInvoice
      if (procedure === 'invoices.lastInvoiceThisYear')
        json = { number: '2026-009' }
      if (procedure === 'invoices.lastInvoice') json = sourceInvoice
      if (procedure === 'invoices.listShares') json = []
      if (procedure === 'invoices.getExchangeRate') json = 24.5
      if (procedure === 'invoices.listTemplates') {
        if (state.failList)
          return {
            error: {
              json: {
                message: 'Unavailable',
                code: -32603,
                data: {
                  code: 'INTERNAL_SERVER_ERROR',
                  httpStatus: 500,
                  path: procedure
                }
              }
            }
          }
        json = state.templates
      }
      if (procedure === 'invoices.saveTemplateFromInvoice') {
        const input = inputs[index].json
        state.saves.push(input.data)
        const template = {
          ...initialTemplate,
          name: input.name,
          data: input.data
        }
        state.templates = [template]
        json = template
      }
      if (procedure === 'invoices.create') {
        state.creates.push(inputs[index].json)
        json = sourceInvoice.id
      }
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
  return state
}

test('saves reusable descriptions and creates a repeat invoice with fresh dates and preserved settings', async ({
  page
}, testInfo) => {
  const state = await setup(page)
  await page.goto(`${url}/invoices/${sourceInvoice.id}`)
  await page
    .getByRole('button', { name: 'Uložit jako šablonu', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Název šablony').fill('   ')
  await expect(
    dialog.getByRole('button', { name: 'Uložit šablonu', exact: true })
  ).toBeDisabled()
  await dialog.getByLabel('Název šablony').fill(' Monthly services ')
  await dialog
    .getByLabel('Popis položky 1', { exact: true })
    .fill('Services {{previousMonth}} / {{month}}')
  await dialog.getByLabel('Poznámka šablony').fill('Issued {{date}}')
  await dialog.screenshot({ path: testInfo.outputPath('save-template.png') })
  await dialog
    .getByRole('button', { name: 'Uložit šablonu', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Duplikovat', exact: true }).click()
  await expect(
    page.getByLabel('Popis položky', { exact: true }).first()
  ).toHaveValue('Original service')
  expect(state.saves[0].invoice).not.toHaveProperty('issued_on')
  expect(state.saves[0].invoice).not.toHaveProperty('number')

  await page.goto(`${url}/new-invoice`)
  await page
    .getByRole('link', { name: 'Vystavit ze šablony', exact: true })
    .click()
  await expect(
    dialog.getByText('Monthly services', { exact: true })
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Použít', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByLabel('Číslo faktury', { exact: true })).toHaveValue(
    '2026-010'
  )
  await expect(
    page.getByLabel('Popis položky', { exact: true }).first()
  ).toHaveValue('Services September / October')
  await expect(page.getByLabel('Poznámka', { exact: true })).toHaveValue(
    'Issued 2026-10-15'
  )
  await expect(page.getByLabel('Splatnost (v dnech)')).toHaveValue('30')
  await expect(page.getByLabel('Kurz', { exact: true })).toHaveValue('24.5')
  await page.getByRole('button', { name: 'Vytvořit fakturu' }).click()
  await expect.poll(() => state.creates.length).toBe(1)
  expect(state.creates[0].invoice).toMatchObject({
    number: '2026-010',
    issued_on: '2026-10-15',
    taxable_fulfillment_due: '2026-09-30',
    currency: 'EUR',
    language: 'en',
    due_in_days: 30,
    exchange_rate: 24.5,
    client_contact_id: 'client',
    bank_account: '',
    iban: sourceInvoice.iban,
    swift_bic: '',
    footer_note: 'Issued 2026-10-15'
  })
  expect(state.creates[0].items).toMatchObject([
    {
      description: 'Services September / October',
      quantity: 2,
      unit_price: 100,
      vat_rate: 0,
      order: 0
    },
    {
      description: 'Support',
      quantity: 1,
      unit_price: 100,
      vat_rate: 0,
      order: 1
    }
  ])
  expect(state.creates[0].items[0]).not.toHaveProperty('id')
})

test('shows failed template loads with a retry instead of claiming there are no templates', async ({
  page
}) => {
  test.setTimeout(30_000)
  const state = await setup(page)
  state.failList = true
  await page.goto(`${url}/new-invoice?fromTemplate=true`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toHaveText(
    'Nepodařilo se načíst šablony.',
    { timeout: 15_000 }
  )
  await expect(dialog.getByText(/Zatím nemáte/)).not.toBeVisible()
  state.failList = false
  await dialog.getByRole('button', { name: 'Zkusit znovu' }).click()
  await expect(
    dialog.getByText('Monthly services', { exact: true })
  ).toBeVisible()
})

test('requires another customer when the saved contact was deleted', async ({
  page
}) => {
  const state = await setup(page)
  state.templates[0].data.invoice.client_contact_id = 'deleted-client'
  await page.goto(`${url}/new-invoice?fromTemplate=true`)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Použít', exact: true })
    .click()
  await expect(page.getByTestId('contact-combobox')).toContainText(
    'Vyberte kontakt...'
  )
  await expect(
    page.getByRole('button', { name: 'Vytvořit fakturu' })
  ).toBeDisabled()
  await expect(
    page.getByText('Kontakt ze šablony nebyl nalezen, vyberte prosím jiný.')
  ).toBeVisible()
  await page.getByTestId('contact-combobox').click()
  await page.getByRole('option', { name: 'Client', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Vytvořit fakturu' })
  ).toBeEnabled()
})
