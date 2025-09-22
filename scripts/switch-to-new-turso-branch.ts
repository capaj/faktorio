#!/usr/bin/env bun
import { $ } from 'bun'
import { readFile, writeFile, cp } from 'node:fs/promises'

const SOURCE_DB = 'faktorio-prod'
const DEFAULT_SUFFIX = `migration-${new Date()
  .toISOString()
  .replace(/[-:T]/g, '')
  .slice(0, 12)}`
const VARS_PATH = 'faktorio-api/.dev.vars'

async function main() {
  const suffix = Bun.argv[2] ?? DEFAULT_SUFFIX
  const targetDb = suffix.startsWith(SOURCE_DB)
    ? suffix
    : `${SOURCE_DB}-${suffix}`

  try {
    await $`turso --version`.quiet()

    console.log(`Creating database '${targetDb}' from '${SOURCE_DB}'...`)
    const createOutput = await $`turso db create ${targetDb} --from-db ${SOURCE_DB} --wait`.text()
    process.stdout.write(createOutput)

    console.log('Fetching connection URL...')
    const dbUrl = (await $`turso db show ${targetDb} --url`.text()).trim()
    if (!dbUrl) throw new Error('Unable to resolve database URL')

    console.log('Generating auth token...')
    const token = (await $`turso db tokens create ${targetDb}`.text()).trim()
    if (!token) throw new Error('Unable to obtain database token')

    console.log(`Updating ${VARS_PATH} (backup saved as ${VARS_PATH}.bak)...`)
    await cp(VARS_PATH, `${VARS_PATH}.bak`)

    const lines = (await readFile(VARS_PATH, 'utf8')).split(/\r?\n/)
    const updated: string[] = []

    for (const line of lines) {
      if (line.startsWith('TURSO_DATABASE_URL=')) {
        updated.push(`# ${line} (prod)`)
        updated.push(`TURSO_DATABASE_URL=${dbUrl}`)
      } else if (line.startsWith('TURSO_AUTH_TOKEN=')) {
        updated.push(`# ${line} (prod)`)
        updated.push(`TURSO_AUTH_TOKEN=${token}`)
      } else {
        updated.push(line)
      }
    }

    await writeFile(VARS_PATH, updated.join('\n'), 'utf8')

    console.log('\nNew database ready:')
    console.log(`  Name:   ${targetDb}`)
    console.log(`  URL:    ${dbUrl}`)
    console.log(`  Token:  ${token}`)
    console.log(`\nProd values remain commented in ${VARS_PATH}; restore via ${VARS_PATH}.bak if needed.`)
  } catch (error) {
    console.error('Failed to create Turso database:', error)
    process.exit(1)
  }
}

await main()
