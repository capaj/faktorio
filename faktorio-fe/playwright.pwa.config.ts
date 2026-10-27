import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pwa',
  testMatch: '**/*.pw.ts',
  outputDir: '../test-results/pwa',
  workers: 1,
  use: {
    headless: true,
    launchOptions: { args: ['--no-sandbox'] }
  }
})
