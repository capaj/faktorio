import { config } from 'dotenv'

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'

config({ path: '.dev.vars' })

const turso = createClient({
	url: process.env.TURSO_DATABASE_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(turso)

const main = async () => {
	await migrate(db, { migrationsFolder: 'drizzle' })
	console.log('migrated')

	process.exit(0)
}
main()
