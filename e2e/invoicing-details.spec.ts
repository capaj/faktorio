import { expect } from './fixtures'

import { test } from './fixtures'

test.skip('invoicing details', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Moje fakturační údaje' })
  ).toBeVisible()

  // Fill in IČO and wait for ARES data to populate
  const icoInput = page.getByLabel(
    'IČO - po vyplnění se automaticky doplní další údaje z ARESU'
  )
  await icoInput.fill('02563479')

  // Verify ARES-populated fields (match screenshot where ARES provides data)
  await expect(page.getByLabel('Jméno *')).toHaveValue('')
  await expect(page.getByLabel('Ulice *')).toHaveValue('')
  await expect(page.getByLabel('Ulice 2')).toHaveValue('') // Assuming empty as per screenshot for this IČO
  await expect(page.getByLabel('Město *')).toHaveValue('Sokolnice')
  await expect(page.getByLabel('Poštovní směrovací číslo *')).toHaveValue(
    '66452'
  )
  await expect(page.getByLabel('Země *')).toHaveValue('Česká republika')
  await expect(page.getByLabel('DIČ')).toHaveValue('CZ8807204153')

  // Verify other fields for the new user
  // await expect(page.getByLabel('Email')).toHaveValue(uniqueEmail)
  // For a new user, other non-ARES fields are expected to be empty unless they have defaults I am unaware of.
  // The screenshot values for bank details, phone etc. are likely for an existing, fully configured user.
  await expect(
    page.getByLabel('Číslo bankovního účtu - včetně bankovního kódu')
  ).toHaveValue('')
  await expect(page.getByLabel('IBAN')).toHaveValue('')
  await expect(page.getByLabel('SWIFT/BIC')).toHaveValue('')
  await expect(page.getByLabel('Telefon')).toHaveValue('')
  await expect(page.getByLabel('Web')).toHaveValue('')
})
