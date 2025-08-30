import { defineConfig } from 'vitest/config'

// we do not use cloudflare vitest-pool-workers environment for testing as we need to access the database on file system
export default defineConfig({
  test: {}
})
