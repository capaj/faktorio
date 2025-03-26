import { test as base } from '@playwright/test';

// Define custom fixtures
export const test = base.extend({
  page: async ({ page }, use) => {
    // Add error handler to throw on page errors
    page.on('pageerror', (error) => {
      throw error;
    });

    // Use the page with the error handler attached
    await use(page);
  },
});

// Re-export expect
export { expect } from '@playwright/test';
