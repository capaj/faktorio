import { test, expect } from './fixtures';
const url = "http://localhost:5173";

test('loads landing page', async ({ page }) => {
  await page.goto(url);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Faktorio/);

});

test('smoke', async ({ page }) => {
  await page.goto(url);


});
