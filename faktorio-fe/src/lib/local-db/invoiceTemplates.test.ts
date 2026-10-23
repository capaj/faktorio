import { expect, it, vi } from 'vitest'
import initSqlJs from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import * as schema from 'faktorio-db/schema'
import { invoiceRouter } from 'faktorio-api/src/routers/invoices/invoiceRouter'
import type { TrpcContext } from 'faktorio-api/src/trpcContext'
import { localDBMigrations } from './migrations'

it('upgrades an existing local database and persists reusable templates', async () => {
  const SQL = await initSqlJs()
  const database = new SQL.Database()
  try {
    const migrations = Object.values(localDBMigrations)
    for (const migration of migrations.slice(0, -1)) database.run(migration)
    database.run(
      "INSERT INTO users (id, email, name) VALUES ('local-owner', 'local@example.test', 'Owner')"
    )
    database.run(migrations[migrations.length - 1])
    const db = drizzle(database, { schema })
    const user = await db.query.userT.findFirst()
    const caller = invoiceRouter.createCaller({
      db: db as unknown as TrpcContext['db'],
      user,
      env: {} as TrpcContext['env'],
      req: new Request('https://app.example.test'),
      sendEmail: vi.fn(),
      generateToken: vi.fn()
    })
    const data = {
      invoice: { due_in_days: 14 },
      items: [
        { description: 'Services {{month}}', quantity: 1, unit_price: 100 }
      ]
    }
    const template = await caller.saveTemplateFromInvoice({
      name: 'Monthly',
      data
    })
    await caller.saveTemplateFromInvoice({
      name: 'Monthly',
      data: { ...data, invoice: { due_in_days: 30 } }
    })
    expect(await caller.listTemplates()).toMatchObject([
      { id: template.id, data: { invoice: { due_in_days: 30 } } }
    ])
    const restoredDatabase = new SQL.Database(database.export())
    expect(
      restoredDatabase.exec('SELECT name FROM invoice_template')[0].values
    ).toEqual([['Monthly']])
    restoredDatabase.close()
  } finally {
    database.close()
  }
})
