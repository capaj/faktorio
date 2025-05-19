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

  await expect(page.getByText('Žádné faktury k zobrazení.')).toBeVisible()
  // Verify we are on the MyInvoicingDetails page
})

test.afterEach(async ({ page }) => {
  // Ensure we are logged in, then navigate to account deletion
  // If the main test failed, page might be in an unexpected state.
  // It's often better to ensure a clean state or handle errors gracefully.
  // For now, assume the user is still logged in from the 'smoke' test.

  // Click on the user profile icon to open the dropdown menu
  await page.getByLabel('Uživatelský profil').click()

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
