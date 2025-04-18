import initSqlJs, { Database } from 'sql.js'
import migration0000 from '@api/drizzle/0000_dry_rick_jones.sql?raw'
import migration0001 from '@api/drizzle/0001_glossy_siren.sql?raw'
import migration0002 from '@api/drizzle/0002_groovy_cammi.sql?raw'
import migration0003 from '@api/drizzle/0003_glorious_hiroim.sql?raw'
import migration0004 from '@api/drizzle/0004_tense_network.sql?raw'
import migration0005 from '@api/drizzle/0005_funny_abomination.sql?raw'
import migration0006 from '@api/drizzle/0006_fuzzy_epoch.sql?raw'
import migration0007 from '@api/drizzle/0007_past_prism.sql?raw'

const SQL_JS_WASM_URL = 'https://sql.js.org/dist/sql-wasm.wasm'
const LOCAL_DB_LIST_KEY = 'faktorio_local_db_files'

async function getSqlJs() {
  return initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  })
}

async function getOpfsRoot() {
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
  const migrations = [
    migration0000,
    migration0001,
    migration0002,
    migration0003,
    migration0004,
    migration0005,
    migration0006,
    migration0007
  ]
  for (const migration of migrations) {
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
  }
  console.log('Migrations applied successfully.')
}

// Creates a new, empty, migrated database and saves it to OPFS
export async function createNewDatabase(
  filename: string
): Promise<Database | null> {
  try {
    console.log(`Creating new database: ${filename}...`)
    const SQL = await getSqlJs()
    const db = new SQL.Database()

    await runMigrations(db)

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
    return null
  }
}

// --- Original initSqlDb (modified slightly) ---
// This might still be useful for a default/single DB scenario
// Or could be deprecated/removed if only named DBs are used.
const DEFAULT_DB_FILENAME = 'my_opfs_database.sqlite'

export const initSqlDb = async (
  filename: string = DEFAULT_DB_FILENAME
): Promise<Database | null> => {
  let db: Database | null = null

  // Try to load the database from OPFS
  db = await loadDatabaseFromOPFS(filename)

  if (!db) {
    // If loading failed, create a new database
    console.log(`Database ${filename} not found or empty, creating anew...`)
    db = await createNewDatabase(filename)
  } else {
    console.log(`Existing database ${filename} loaded.`)
    // Optionally, run checks or migrations on existing DB if needed
    // addTrackedDbFile(filename); // Ensure it's tracked if loaded successfully
  }

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
