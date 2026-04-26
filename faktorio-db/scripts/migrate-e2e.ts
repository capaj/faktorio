import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { dirname, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = resolve(__dirname, '../drizzle')
const url = process.env.SQLD_URL ?? 'http://127.0.0.1:8080'
const timeoutMs = 60_000

const main = async () => {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const probe = createClient({ url })
      await probe.execute('SELECT 1')
      probe.close()
      lastError = null
      break
    } catch (err) {
      lastError = err
      await setTimeout(250)
    }
  }
  if (lastError) {
    throw new Error(
      `sqld not reachable at ${url} within ${timeoutMs}ms: ${String(lastError)}`
    )
  }

  const client = createClient({ url })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder })
  client.close()
  console.log(`E2E DB migrated at ${url}`)
}

main()
