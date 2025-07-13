import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from 'faktorio-db/db'

const main = async () => {
  await migrate(db, { migrationsFolder: 'drizzle' })
  console.log('migrated')

  process.exit(0)
}
main()
