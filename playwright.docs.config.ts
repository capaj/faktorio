import { defineConfig } from '@playwright/test'

// Reuse the mocked composer workflow: no database, account or email delivery.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'invoice-email.spec.ts',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  metadata: { documentationScreenshots: true },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague'
  },
  webServer: {
    command:
      'pnpm --filter faktorio-fe dev --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: { VITE_API_URL: 'http://localhost:9189/trpc' }
  }
})
