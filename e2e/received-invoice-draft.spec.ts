import { expect, test } from './fixtures'

const url = 'http://localhost:5173'

test('restores an unfinished received invoice after navigation', async ({
  page
}) => {
  await page.addInitScript(() => {
    const now = new Date().toISOString()
    localStorage.setItem('auth_token', 'e2e-draft-test-token')
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'e2e-received-invoice-draft-user',
        email: 'received-invoice-draft@example.test',
        name: 'Draft Test User',
        passwordHash: null,
        pictureUrl: null,
        googleId: null,
        createdAt: now,
        updatedAt: now
      })
    )
  })

  await page.route('**/trpc/receivedInvoices.list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ result: { data: { json: [] } } }])
    })
  })

  await page.goto(`${url}/received-invoices`)
  await page.getByRole('button', { name: 'Přidat fakturu' }).first().click()

  await page
    .getByRole('textbox', { name: 'Název dodavatele *' })
    .fill('Rozpracovaný dodavatel')
  await page
    .getByRole('textbox', { name: 'Číslo faktury *' })
    .fill('DRAFT-2026-42')
  await page.getByRole('spinbutton', { name: 'Celkem s DPH *' }).fill('1250')

  await page.getByRole('link', { name: 'Blog', exact: true }).first().click()
  await expect(page).toHaveURL(`${url}/blog`)
  await page.getByRole('link', { name: 'Přijaté', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'Nová přijatá faktura' })
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Název dodavatele *' })
  ).toHaveValue('Rozpracovaný dodavatel')
  await expect(
    page.getByRole('textbox', { name: 'Číslo faktury *' })
  ).toHaveValue('DRAFT-2026-42')
  await expect(
    page.getByRole('spinbutton', { name: 'Celkem s DPH *' })
  ).toHaveValue('1250')

  await page.reload()

  await expect(
    page.getByRole('heading', { name: 'Nová přijatá faktura' })
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Název dodavatele *' })
  ).toHaveValue('Rozpracovaný dodavatel')
})
