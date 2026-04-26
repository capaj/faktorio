import { execSync } from 'node:child_process'

export default async function globalSetup() {
  execSync('pnpm --filter faktorio-db migrate-e2e', { stdio: 'inherit' })
}
