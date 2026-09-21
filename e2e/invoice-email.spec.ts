import { expect, test } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

test('invoice email composer uses the contact language, preserves edits and sends reminders', async ({
  page
}, testInfo) => {
  const captureComposer = async (filename: string) => {
    if (!testInfo.project.metadata.documentationScreenshots) return
    const directory = resolve('docs/screenshots')
    await mkdir(directory, { recursive: true })
    await page.evaluate(() => document.fonts.ready)
    // Expand only for documentation so the complete draft is visible.
    const textarea = page
      .getByRole('dialog')
      .getByLabel('Zpráva', { exact: true })
    await textarea.evaluate((element) => {
      if (element.scrollHeight > element.clientHeight) {
        element.style.height = `${element.scrollHeight + 24}px`
      }
    })
    await page.getByRole('dialog').getByRole('heading').click()
    await page.getByRole('dialog').screenshot({
      path: resolve(directory, filename),
      animations: 'disabled',
      caret: 'hide'
    })
  }
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'email-composer-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'email-test-user',
        name: 'Seller',
        email: 'seller@example.com'
      })
    )
  })
  const invoice = {
    id: 'email-test-invoice',
    number: '2026-123',
    language: 'cs',
    your_name: 'Seller',
    your_street: 'Street 1',
    your_city: 'Prague',
    your_zip: '11000',
    your_country: 'CZ',
    your_registration_no: '12345678',
    your_vat_no: '',
    client_name: 'Client',
    client_street: 'Street 2',
    client_city: 'London',
    client_zip: '12345',
    client_country: 'GB',
    issued_on: '2026-09-01',
    taxable_fulfillment_due: '2026-09-01',
    due_on: '2026-09-15',
    due_in_days: 14,
    bank_account: '123456789/0100',
    currency: 'CZK',
    total: 100,
    paid_on: null,
    status: null,
    cancelled_at: null,
    sent_at: null,
    reminder_sent_at: null,
    items: [
      {
        id: 1,
        description: 'Work',
        quantity: 1,
        unit_price: 100,
        vat_rate: 0,
        unit: 'ks'
      }
    ]
  }
  const sends: Record<string, unknown>[] = []
  let failSend = false
  await page.route('**/trpc/**', async (route) => {
    const url = new URL(route.request().url())
    const procedures = url.pathname.split('/trpc/')[1].split(',')
    const inputs = JSON.parse(
      route.request().postData() || url.searchParams.get('input') || '{}'
    )
    const response = procedures.map((procedure, index) => {
      let json: unknown = null
      if (procedure === 'invoices.getById') json = invoice
      if (procedure === 'invoicingDetails')
        json = { name: 'Seller', vat_payer: false, bankAccounts: [] }
      if (procedure === 'invoices.listShares') json = []
      if (procedure === 'invoices.getEmailDraft')
        json = {
          to: 'client@example.com',
          language: 'en',
          number: invoice.number,
          dueOn: invoice.due_on,
          senderName: 'Seller'
        }
      if (procedure === 'invoices.sendEmail') {
        if (failSend)
          return {
            error: {
              json: {
                message: 'E-mail se nepodařilo odeslat.',
                code: -32603,
                data: {
                  code: 'INTERNAL_SERVER_ERROR',
                  httpStatus: 500,
                  path: procedure
                }
              }
            }
          }
        sends.push(inputs[index].json)
        json = { sentAt: '2026-09-21' }
      }
      return { result: { data: { json } } }
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
  await page.goto('http://localhost:5173/invoices/email-test-invoice')
  await page
    .getByRole('button', { name: 'Odeslat fakturu', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  const language = dialog.getByLabel('Jazyk e-mailu', { exact: true })
  const subject = dialog.getByLabel('Předmět', { exact: true })
  const body = dialog.getByLabel('Zpráva', { exact: true })
  await expect(language).toHaveValue('en')
  await expect(subject).toHaveValue('Invoice 2026-123')
  await expect(dialog.getByLabel('Příjemce')).toHaveValue('client@example.com')
  await language.selectOption('cs')
  await expect(subject).toHaveValue('Faktura 2026-123')
  await captureComposer('invoice-email-cs.png')
  await body.fill('Vlastní zpráva')
  page.once('dialog', (confirmation) => confirmation.dismiss())
  await language.selectOption('en')
  await expect(language).toHaveValue('cs')
  await expect(body).toHaveValue('Vlastní zpráva')
  page.once('dialog', (confirmation) => confirmation.accept())
  await language.selectOption('en')
  await expect(body).toHaveValue(/Hello,/)
  await subject.fill('Custom subject')
  await body.fill('Please review my invoice.')
  await dialog.getByLabel('Příjemce').fill('other@example.com')
  // A background query refetch must not reset the draft.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(body).toHaveValue('Please review my invoice.')
  failSend = true
  await dialog
    .getByRole('button', { name: 'Odeslat e-mail', exact: true })
    .click()
  await expect(
    page.getByText('E-mail se nepodařilo odeslat.').first()
  ).toBeVisible()
  await expect(body).toHaveValue('Please review my invoice.')
  failSend = false
  await dialog
    .getByRole('button', { name: 'Odeslat e-mail', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  expect(sends).toEqual([
    {
      invoiceId: invoice.id,
      kind: 'invoice',
      language: 'en',
      to: 'other@example.com',
      subject: 'Custom subject',
      body: 'Please review my invoice.'
    }
  ])
  await page
    .getByRole('button', { name: 'Odeslat upomínku', exact: true })
    .click()
  await expect(subject).toHaveValue('Payment reminder – invoice 2026-123')
  await expect(body).toHaveValue(/remains unpaid/)
  await captureComposer('invoice-reminder-en.png')
  await dialog
    .getByRole('button', { name: 'Odeslat e-mail', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  expect(sends[1]).toMatchObject({ kind: 'reminder', language: 'en' })
})
