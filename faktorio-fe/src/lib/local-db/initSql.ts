import initSqlJs, { Database, SqlValue } from 'sql.js'
import { localDBMigrations } from './migrations'

const LOCAL_DB_LIST_KEY = 'faktorio_local_db_files'

async function getSqlJs() {
  return initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  })
}

export async function getOpfsRoot() {
  return navigator.storage.getDirectory()
}

export async function saveDatabaseToOPFS(db: Database, filename: string) {
  const binaryData = db.export()
  const root = await getOpfsRoot()
  const fileHandle = await root.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(binaryData)
  await writable.close()
  console.log(`Database saved to OPFS: ${filename}`)
}

async function loadDatabaseFromOPFS(
  filename: string
): Promise<Database | null> {
  try {
    const root = await getOpfsRoot()
    const fileHandle = await root.getFileHandle(filename) // Don't create if it doesn't exist
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      console.warn(`OPFS file ${filename} is empty. Cannot load database.`)
      return null // Handle empty file case
    }
    const uint8Array = new Uint8Array(arrayBuffer)
    const SQL = await getSqlJs()
    const db = new SQL.Database(uint8Array)
    console.log(`Database loaded from OPFS: ${filename}`)
    return db
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      console.log(`Database file not found in OPFS: ${filename}`)
    } else {
      console.error(`Error loading database ${filename} from OPFS:`, error)
    }
    return null
  }
}

// Function to get the list of tracked DB files from local storage
export function getTrackedDbFiles(): string[] {
  const stored = localStorage.getItem(LOCAL_DB_LIST_KEY)
  return stored ? JSON.parse(stored) : []
}

// Function to update the list of tracked DB files in local storage
function updateTrackedDbFiles(files: string[]): void {
  localStorage.setItem(LOCAL_DB_LIST_KEY, JSON.stringify(files))
}

// Function to add a new DB file to the tracked list
function addTrackedDbFile(filename: string): void {
  const currentFiles = getTrackedDbFiles()
  if (!currentFiles.includes(filename)) {
    updateTrackedDbFiles([...currentFiles, filename])
  }
}

// Function to remove a DB file from the tracked list
export function removeTrackedDbFile(filename: string): void {
  const currentFiles = getTrackedDbFiles()
  const updatedFiles = currentFiles.filter((file) => file !== filename)
  updateTrackedDbFiles(updatedFiles)
}

// Function to list all files in the OPFS root directory
export async function listOpfsFiles(): Promise<string[]> {
  const root = await getOpfsRoot()
  const files: string[] = []
  // @ts-expect-error - entries() is valid but TS might complain
  for await (const entry of root.entries()) {
    if (entry.kind === 'file') {
      files.push(entry.name)
    }
  }
  return files
}

async function runMigrations(db: Database): Promise<void> {
  db.run(
    'CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY NOT NULL);'
  )

  const queryResult = db.exec('SELECT name FROM __migrations;')
  let appliedMigrations: SqlValue[] = []

  if (queryResult.length > 0 && queryResult[0] && queryResult[0].values) {
    appliedMigrations = queryResult[0].values.map((row: SqlValue[]) => row[0])
  }

  for (const [migrationName, migration] of Object.entries(localDBMigrations)) {
    if (appliedMigrations.includes(migrationName)) {
      continue
    }
    const statements = migration
      .split('--> statement-breakpoint')
      .filter((stmt) => stmt.trim())
    for (const statement of statements) {
      try {
        db.run(statement)
      } catch (error) {
        console.error('Migration error:', error)
        console.error('Failed statement:', statement)
        throw new Error(`Migration failed for statement: ${statement}`) // Re-throw to signal failure
      }
    }
    db.run('INSERT INTO __migrations (name) VALUES (?)', [migrationName])
    console.log(`Applied: ${migrationName}`)
  }
  console.log('All migrations applied successfully.')
}

// Creates a new, empty, migrated database and saves it to OPFS
export async function createNewDatabase(filename: string): Promise<Database> {
  try {
    console.log(`Creating new database: ${filename}...`)
    const SQL = await getSqlJs()
    const db = new SQL.Database()

    await saveDatabaseToOPFS(db, filename)
    addTrackedDbFile(filename) // Track the new file
    console.log(`New database ${filename} created, migrated, and saved.`)
    return db
  } catch (error) {
    console.error(`Failed to create database ${filename}:`, error)
    // Attempt to clean up if file creation started but failed
    try {
      const root = await getOpfsRoot()
      await root.removeEntry(filename)
      console.log(`Cleaned up potentially partially created file: ${filename}`)
    } catch (cleanupError: any) {
      if (cleanupError.name !== 'NotFoundError') {
        console.error(
          `Failed to clean up file ${filename} after creation error:`,
          cleanupError
        )
      }
    }
    throw error
  }
}

export const initSqlDb = async (filename: string): Promise<Database> => {
  let db: Database | null = null

  // Try to load the database from OPFS
  db = await loadDatabaseFromOPFS(filename)

  if (!db) {
    // If loading failed, create a new database
    console.log(`Database ${filename} not found or empty, creating anew...`)
    db = await createNewDatabase(filename)
  } else {
    console.log(`Existing database ${filename} loaded.`)
  }

  await runMigrations(db)

  return db
}

// Function to delete a database file from OPFS
export async function deleteDatabase(filename: string): Promise<boolean> {
  try {
    const root = await getOpfsRoot()
    await root.removeEntry(filename)
    removeTrackedDbFile(filename)
    console.log(`Database ${filename} deleted successfully.`)
    return true
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      console.log(
        `Database file ${filename} not found in OPFS. Removing from tracking only.`
      )
      removeTrackedDbFile(filename)
      return true
    }
    console.error(`Failed to delete database ${filename}:`, error)
    return false
  }
}

// Function to export database from OPFS to a downloadable file
export async function exportDatabaseFile(filename: string): Promise<boolean> {
  // Load the database from OPFS
  const db = await loadDatabaseFromOPFS(filename)
  if (!db) {
    console.error(`Failed to load database ${filename} for export`)
    return false
  }

  // Export the database as a binary blob
  const binaryArray = db.export()
  const blob = new Blob([binaryArray], { type: 'application/octet-stream' })

  // Create a download link and trigger the download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)

  return true
}

// Function to import a database file to OPFS
export async function importDatabaseFile(file: File): Promise<boolean> {
  if (!file.name.endsWith('.sqlite')) {
    console.error('Invalid file format. Please select a .sqlite file.')
    return false
  }

  const filename = file.name
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Load the database from the file
  const SQL = await getSqlJs()
  let db: Database

  try {
    db = new SQL.Database(uint8Array)
  } catch (error) {
    console.error('Invalid SQLite database file:', error)
    return false
  }

  // Save the database to OPFS
  await saveDatabaseToOPFS(db, filename)

  // Add to tracked files
  addTrackedDbFile(filename)

  console.log(`Database ${filename} imported successfully`)
  return true
}
