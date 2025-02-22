import initSqlJs, { Database } from 'sql.js'
import migration0000 from '@api/drizzle/0000_dry_rick_jones.sql?raw'
import migration0001 from '@api/drizzle/0001_glossy_siren.sql?raw'

async function saveDatabaseToOPFS(db: Database, filename: string) {
  const binaryData = db.export()
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(binaryData)
  await writable.close()
  console.log(`Database saved to OPFS: ${filename}`)
}

async function loadDatabaseFromOPFS(filename: string) {
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(filename, { create: true })
  const file = await fileHandle.getFile()
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  const SQL = await initSqlJs() //Ensure sql.js is initialized
  const db = new SQL.Database(uint8Array)
  console.log(`Database loaded from OPFS: ${filename}`)
  return db
}

export const initSqlDb = async () => {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  })
  let db: Database | null = null
  const filename = 'my_opfs_database.sqlite'

  // Try to load the database from OPFS
  db = await loadDatabaseFromOPFS(filename)

  if (!db) {
    // If loading failed (e.g., first run), create a new database
    console.log('Creating a new database...')
    db = new SQL.Database()

    // Apply migrations
    const migrations = [migration0000, migration0001]
    for (const migration of migrations) {
      const statements = migration.split('-->').filter((stmt) => stmt.trim())
      for (const statement of statements) {
        try {
          db.run(statement)
        } catch (error) {
          console.error('Migration error:', error)
          console.error('Failed statement:', statement)
        }
      }
    }

    // Save the initialized database
    await saveDatabaseToOPFS(db, filename)
  }

  return db
}
