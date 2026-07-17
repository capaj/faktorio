import { expect, test } from './fixtures'

const url = 'http://localhost:5173'

test.setTimeout(60_000)

test('submits the reported invoicing details with a default bank account', async ({
  page
}) => {
  await page.goto(url)
  await page
    .getByRole('link', { name: 'Registrace', exact: true })
    .first()
    .click()

  const uniqueEmail = `invoicing-details-${Date.now()}@test.com`
  await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail)
  await page.getByRole('textbox', { name: 'Celé jméno' }).fill('Test User')
  await page.getByRole('textbox', { name: 'Heslo' }).fill('test123')
  await page.getByRole('textbox', { name: 'Potvrzení hesla' }).fill('test123')
  await page.getByRole('button', { name: 'Zaregistrovat se' }).click()

  await expect(page.getByText('Žádné faktury k zobrazení.')).toBeVisible({
    timeout: 30_000
  })

  await page.goto(`${url}/my-details`)
  await expect(
    page.getByRole('heading', { name: 'Moje fakturační údaje' })
  ).toBeVisible()

  await page.getByLabel('IČO', { exact: true }).fill('21269637')
  await page.getByLabel('Jméno', { exact: true }).fill('Test Buršík')
  await page.getByLabel('Ulice', { exact: true }).fill('Divadelní 603/3')
  await page.getByLabel('Ulice 2', { exact: true }).fill('Brno-město')
  await page.getByLabel('Město', { exact: true }).fill('Brno')
  await page
    .getByLabel('Poštovní směrovací číslo', { exact: true })
    .fill('60200')
  await page.getByLabel('Email', { exact: true }).fill('Kreczek@email.cz')
  await page.getByLabel('Země', { exact: true }).fill('Česká republika')
  await page.getByRole('checkbox').uncheck()

  await page.getByLabel('Popis / název').fill('Účet')
  await page.getByLabel('Číslo bankovního účtu').fill('670100-2207323463/6210')
  await page.getByLabel('SWIFT / BIC').fill('REVOLT21')

  const upsertResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/trpc/upsertInvoicingDetails')
  )

  await page.getByRole('button', { name: 'Uložit' }).click()

  const upsertResponse = await upsertResponsePromise
  const responseBody = await upsertResponse.text()
  expect(
    upsertResponse.ok(),
    `upsertInvoicingDetails returned ${upsertResponse.status()}: ${responseBody}`
  ).toBe(true)
  await expect(page.getByText('Údaje byly úspěšně uloženy')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Popis / název')).toHaveValue('Účet')
  await expect(page.getByLabel('Číslo bankovního účtu')).toHaveValue(
    '670100-2207323463/6210'
  )
  await expect(page.getByLabel('SWIFT / BIC')).toHaveValue('REVOLT21')

  // Force the existing details and existing bank-account IDs through both
  // ON CONFLICT paths while normalizing back to the same reported value.
  await page.getByLabel('Jméno', { exact: true }).fill('Test Buršík ')
  const updateResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/trpc/upsertInvoicingDetails')
  )
  await page.getByRole('button', { name: 'Uložit' }).click()

  const updateResponse = await updateResponsePromise
  const updateResponseBody = await updateResponse.text()
  expect(
    updateResponse.ok(),
    `existing-account upsert returned ${updateResponse.status()}: ${updateResponseBody}`
  ).toBe(true)
  await expect(page.getByText('Údaje byly úspěšně uloženy')).toBeVisible()
})
