import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Derive __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// This script assumes it's run from the root of the monorepo.
// So, __dirname here would be faktorio-api/scripts if run with node faktorio-api/scripts/generate-dev-vars.ts
// The .dev.vars file should be at faktorio-api/.dev.vars
const devVarsPath: string = path.join(__dirname, '../.dev.vars')

const envVarsToInclude: string[] = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'JWT_SECRET',
  'MAILJET_API_KEY',
  'MAILJET_API_SECRET',
  'GEMINI_API_KEY'
]

let devVarsContent: string = ''

console.log('Generating .dev.vars file for faktorio-api')
console.log(`Target path: ${devVarsPath}`)

for (const key of envVarsToInclude) {
  const value: string | undefined = process.env[key]
  const cleanedValue: string = value?.replace(/"/g, '\\"') ?? ''
  devVarsContent += `${key}="${cleanedValue}"\n`
}

fs.writeFileSync(devVarsPath, devVarsContent.trim())
console.log(`.dev.vars file generated successfully at ${devVarsPath}`)
