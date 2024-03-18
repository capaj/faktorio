import { getTableName, sql } from 'drizzle-orm'
import * as schema from '../src/schema'
import { db } from '../src/db'

const allTableNames = Object.values(schema).map(
  (table) => getTableName(table) as string
)
allTableNames.push('__drizzle_migrations')

console.log('allTableNames:', allTableNames)

console.log('disabling foreign keys...')
await db.run(sql.raw('PRAGMA foreign_keys=OFF'))
for (const table of allTableNames) {
  console.log(`Dropping table ${table}`)
  await db.run(sql.raw(`DROP TABLE ${table}`))
}

await db.run(sql.raw('PRAGMA foreign_keys=ON'))
// console.log('All tables dropped, foreign keys enabled again.')
