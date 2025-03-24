import { Column, sql } from 'drizzle-orm'
import { SQLiteTable, SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core'

export function conflictUpdateSet<TTable extends SQLiteTable>(
  table: TTable,
  columns: (keyof TTable['_']['columns'] & keyof TTable)[]
): SQLiteUpdateSetSource<TTable> {
  return Object.assign(
    {},
    ...columns.map((k) => ({
      [k]: sql.raw(`excluded.${(table[k] as Column).name}`)
    }))
  ) as SQLiteUpdateSetSource<TTable>
}

export function conflictUpdateSetAll<TTable extends SQLiteTable>(
  table: TTable
): SQLiteUpdateSetSource<TTable> {
  // console.log('table._.columns:', table)
  const columns = Object.values(table).map((c) => c.name)
  // console.log('columns:', columns)

  return Object.assign(
    {},
    ...columns.map((k) => {
      // @ts-expect-error
      const raw = `excluded.${(table[k] as Column).name}`
      return {
        [k]: sql.raw(raw)
      }
    })
  ) as SQLiteUpdateSetSource<TTable>
}
