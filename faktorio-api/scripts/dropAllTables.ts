import { getTableName, sql } from 'drizzle-orm'
import * as schema from '../src/schema'
import { db } from '../src/db'

const allTableNames = Object.values(schema).map((table) => getTableName(table))

for (const table of allTableNames) {
  console.log(`Dropping table ${table}`)
  await db.run(sql.raw(`DROP TABLE ${table}`))
}
