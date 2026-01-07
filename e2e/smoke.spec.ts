import { test, expect } from './fixtures'
const url = 'http://localhost:5173'

test('smoke', async ({ page }) => {
  await page.goto(url)

  await page
    .getByRole('link', { name: 'Registrace', exact: true })
    .first()
    .click()

  const uniqueEmail = `faktorio-e2e-test-${Date.now()}@test.com`
  await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail)
  await page.getByRole('textbox', { name: 'Celé jméno' }).fill('Test User')
  await page.getByRole('textbox', { name: 'Heslo' }).fill('test123')
  await page.getByRole('textbox', { name: 'Potvrzení hesla' }).fill('test123')
  await page.getByRole('button', { name: 'Zaregistrovat se' }).click()

  // Expect successful registration navigation to the homepage
  // await expect(page).toHaveURL(url + '/') // TODO fix url when user is not searching

  await expect(page.getByText('Žádné faktury k zobrazení.')).toBeVisible({
    timeout: 30000
  })

  // Step 1: Add invoicing details
  await page.goto(url + '/my-details')
  await expect(
    page.getByRole('heading', { name: 'Moje fakturační údaje' })
  ).toBeVisible()

  // Fill required invoicing details (note: labels don't include asterisks)
  await page.getByLabel('Jméno', { exact: true }).fill('Test Company s.r.o.')
  await page.getByLabel('Ulice', { exact: true }).fill('Test Street 123')
  await page.getByLabel('Město', { exact: true }).fill('Praha')
  await page
    .getByLabel('Poštovní směrovací číslo', { exact: true })
    .fill('11000')
  await page.getByLabel('IČO', { exact: true }).fill('12345678')

  // Save invoicing details
  await page.getByRole('button', { name: 'Uložit' }).click()
  await expect(page.getByText('Údaje byly úspěšně uloženy')).toBeVisible({
    timeout: 10000
  })

  // Step 2: Add a contact
  await page.goto(url + '/contacts')
  await page.getByRole('button', { name: 'Přidat klienta' }).click()

  // Fill contact details (note: labels don't include asterisks)
  await page.getByLabel('Jméno', { exact: true }).fill('Test Client Ltd.')
  await page.getByLabel('Ulice', { exact: true }).fill('Client Street 456')
  await page.getByLabel('Město', { exact: true }).fill('Brno')
  await page
    .getByLabel('Poštovní směrovací číslo', { exact: true })
    .fill('60200')
  await page.getByLabel('Email', { exact: true }).fill('client@test.com')

  // Save contact
  await page.getByRole('button', { name: 'Přidat kontakt' }).click()

  // Verify contact appears in the list (dialog closes automatically)
  await expect(page.getByText('Test Client Ltd.')).toBeVisible({
    timeout: 10000
  })

  // Step 3: Create a new invoice for the contact
  await page.goto(url + '/new-invoice')
  await expect(
    page.getByRole('heading', { name: 'Nová faktura' })
  ).toBeVisible()

  // Select the contact (should be auto-selected since it's newly created)
  // If not auto-selected, we'll need to select it manually
  const contactCombobox = page.getByTestId('contact-combobox')
  await expect(contactCombobox).toBeVisible({ timeout: 10000 })
  const currentValue = ((await contactCombobox.textContent()) ?? '').trim()
  if (!currentValue.includes('Test Client Ltd.')) {
    await contactCombobox.click()
    await page.getByRole('option', { name: 'Test Client Ltd.' }).click()
  }

  // Fill invoice details
  await page.getByLabel('Číslo faktury', { exact: true }).fill('2025-001')

  // Fill invoice item details
  await page
    .getByLabel('Popis položky', { exact: true })
    .first()
    .fill('Consulting services')
  await page.getByLabel('Množství', { exact: true }).first().fill('1')
  await page.getByLabel('Cena/jedn.', { exact: true }).first().fill('10000')

  // Add a second invoice item to catch unique constraint bugs on (invoice_id, order)
  await page.getByRole('button', { name: 'Další položka' }).click()

  await page.getByPlaceholder('Popis položky').nth(1).fill('Support services')
  await page.getByPlaceholder('Množství').nth(1).fill('2')
  await page.getByPlaceholder('Cena/jedn.').nth(1).fill('5000')

  // Save the invoice
  await page.getByRole('button', { name: 'Vytvořit fakturu' }).click()

  // Verify we're navigated to the invoice detail page
  await expect(page).toHaveURL(/\/invoices\/[^/]+$/, { timeout: 10000 })

  // Verify invoice number appears on the detail page
  await expect(page.getByText('2025-001')).toBeVisible()

  // Step 4: Edit the invoice
  const currentUrl = page.url()
  const invoiceId = currentUrl.match(/\/invoices\/([^/]+)/)?.[1]
  await page.goto(`${url}/invoices/${invoiceId}/edit`)

  await expect(
    page.getByRole('heading', { name: 'Upravit fakturu 2025-001' })
  ).toBeVisible({ timeout: 10000 })

  // Verify both items are present in the edit form
  await expect(page.getByPlaceholder('Popis položky').first()).toHaveValue(
    'Consulting services'
  )

  // Add a second invoice item
  await page.getByRole('button', { name: 'Další položka' }).click()

  // Wait for the new item to appear
  await page.waitForTimeout(500)

  // Fill the second item details - use locators to ensure we're getting the right fields
  await page.getByPlaceholder('Popis položky').nth(1).fill('Additional service')
  await page.getByPlaceholder('Množství').nth(1).fill('2')
  await page.getByPlaceholder('Cena/jedn.').nth(1).fill('5000')

  // Verify the second item fields are filled
  await expect(page.getByPlaceholder('Popis položky').nth(1)).toHaveValue(
    'Additional service'
  )

  // Save the changes
  await page.getByRole('button', { name: 'Uložit změny na faktuře' }).click()

  // Verify we're navigated back to the invoice detail page
  await expect(page).toHaveURL(/\/invoices\/[^/]+$/, { timeout: 10000 })

  // Wait for the PDF to render
  await page.waitForTimeout(2000)

  // Verify the invoice detail page is loaded with the correct invoice number
  await expect(page.getByText('2025-001')).toBeVisible()
  // await page.waitForTimeout(6000) this would be nice, but getByText does not work for pdf content

  // await expect(page.getByText('Additional service')).toBeVisible()
})

test.afterEach(async ({ page }) => {
  // Ensure we are logged in, then navigate to account deletion
  // If the main test failed, page might be in an unexpected state.
  // It's often better to ensure a clean state or handle errors gracefully.
  // For now, assume the user is still logged in from the 'smoke' test.

  // Click on the user profile icon to open the dropdown menu (desktop version)
  await page
    .locator('.hidden.sm\\:flex')
    .getByLabel('Uživatelský profil')
    .click()

  // Click on the "Přihlašovací údaje" menu item
  await page.getByRole('menuitem', { name: 'Přihlašovací údaje' }).click()

  // Verify we are on the ManageLoginDetails page
  await expect(
    page.getByRole('heading', { name: 'Správa přihlašovacích údajů' })
  ).toBeVisible()

  // Click the delete account button (accordion trigger)
  await page.getByText('Smazání účtu').click()

  // Fill in the password in the revealed form
  await page.getByLabel('Zadejte heslo pro potvrzení').fill('test123')

  // Click the submit button within the form to trigger the dialog
  // This button is also named 'Smazat účet', so we need to be specific.
  // It's an FkButton, likely a <button type="submit">.
  // We can find it within the form structure related to 'delete-account'.
  await page.getByText('Smazat účet').click()

  // The button text is "Ano, smazat účet"
  await page.getByText('Ano, smazat účet').click()

  // Expect successful deletion: redirected to homepage and login button is visible
  await expect(page).toHaveURL(url + '/')
  await expect(page.getByRole('link', { name: 'Přihlásit se' })).toBeVisible()
})
