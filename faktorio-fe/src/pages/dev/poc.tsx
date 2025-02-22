import { Button } from '@/components/ui/button'
import { trpcClient } from '@/lib/trpcClient'
import { useEffect } from 'react'
import initSqlJs, { Database } from 'sql.js'

async function runExample() {
  console.log('Running example...', navigator.storage.estimate())
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
    db.run('CREATE TABLE test (col1, col2);')
    db.run('INSERT INTO test VALUES (?,?), (?,?)', [1, 111, 2, 222])
  } else {
    const checkTable = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='test'"
    )
    // if (checkTable.length === 0) {
    //   console.log('Table "test" not found in loaded DB, creating it...')
    //   db.run('CREATE TABLE test (col1, col2);')
    //   db.run('INSERT INTO test VALUES (?,?), (?,?)', [1, 111, 2, 222])
    // }
    console.log('Loaded existing database from OPFS.')
  }

  // Perform some operations (to demonstrate it's working)
  const result = db.exec('SELECT * FROM test')
  console.log('Data from the database:', result)

  // Modify the database
  db.run('INSERT INTO test VALUES (?, ?)', [3, 333])
  const newResult = db.exec('SELECT * from test')
  console.log('Data after modification', newResult)

  // Save (or overwrite) the database to OPFS
  await saveDatabaseToOPFS(db, filename)
  db.close()
}

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

export const PocPage = () => {
  // const query = trpcClient.test.useQuery() // fails on  No procedure found on path \"__untypedClient,query\"
  const utils = trpcClient.useUtils()

  return (
    <div>
      PocPage
      <Button onClick={runExample}>Run Example</Button>
      <br />
      <Button
        onClick={async () => {
          const res = await utils.test.fetch() // fails on  Uncaught (in promise) TRPCError: No procedure found on path "__untypedClient,__untypedClient,query"
          console.log(utils)
        }}
      >
        trpc
      </Button>
    </div>
  )
}
