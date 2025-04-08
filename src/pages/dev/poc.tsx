import initSqlJs from 'sql.js'
import { Database } from 'sql.js'

async function loadDatabaseFromOPFS(filename: string) {
  try {
    const root = await navigator.storage.getDirectory()
    // If you do NOT want to automatically create the file, you can keep it like this:
    const fileHandle = await root.getFileHandle(filename)
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const SQL = await initSqlJs() //Ensure sql.js is initialized
    const db = new SQL.Database(uint8Array)
    console.log(`Database loaded from OPFS: ${filename}`)
    return db
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      console.log(`File ${filename} not found, returning null.`)
      return null
    }
    throw error // rethrow if it's some other error
  }
}

async function runExample() {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  })
  let db: Database | null = null
  const filename = 'my_opfs_database.sqlite'

  // Try to load the database from OPFS
  db = await loadDatabaseFromOPFS(filename)

  if (!db) {
    console.log('Creating a fresh database...')
    db = new SQL.Database()
    db.run('CREATE TABLE test (col1, col2);')
    db.run('INSERT INTO test VALUES (?,?), (?,?)', [1, 111, 2, 222])
  } else {
    // If loaded from OPFS, ensure the table actually exists
    const checkTable = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='test'"
    )
    if (checkTable.length === 0) {
      console.log('Table "test" not found in loaded DB, creating it...')
      db.run('CREATE TABLE test (col1, col2);')
      db.run('INSERT INTO test VALUES (?,?), (?,?)', [1, 111, 2, 222])
    }
  }

  // Now the table definitely exists:
  const result = db.exec('SELECT * FROM test')
  console.log('Data from the database:', result)

  db.run('INSERT INTO test VALUES (?, ?)', [3, 333])
  const newResult = db.exec('SELECT * FROM test')
  console.log('Data after modification', newResult)

  // Save (or overwrite) the database to OPFS
  // await saveDatabaseToOPFS(db, filename)
  db.close()
}
