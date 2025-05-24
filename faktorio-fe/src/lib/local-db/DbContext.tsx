import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react'
import { getOpfsRoot, initSqlDb, saveDatabaseToOPFS } from './initSql'
import type { Database } from 'sql.js'
import { createId } from '@paralleldrive/cuid2'
import { drizzle } from 'drizzle-orm/sql-js'
import * as schema from 'faktorio-api/src/schema'
import { SQLJsDatabase } from 'drizzle-orm/sql-js'
import { UserSelectType } from 'faktorio-api/src/schema'
import { userSelectSchema } from 'faktorio-api/src/zodDbSchemas'
import z from 'zod/v4'

interface DbContextType {
  activeDbName: string | null
  activeDb: Database | null
  drizzleDb: SQLJsDatabase<typeof schema> | null
  localUser: UserSelectType | null
  isLoading: boolean
  error: string | null
  setActiveDatabase: (dbName: string) => Promise<boolean>
  clearActiveDatabase: () => void
  setLocalUser: (user: UserSelectType) => void
  clearLocalUser: () => void
  saveDatabase: () => void
}

const DbContext = createContext<DbContextType | undefined>(undefined)

interface DbProviderProps {
  children: ReactNode
}

const userLocalStorageSchema = userSelectSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string()
})

const LOCAL_STORAGE_ACTIVE_DB_KEY = 'faktorio_active_db'
const LOCAL_STORAGE_USER_KEY = 'faktorio_local_user'

export function DbProvider({ children }: DbProviderProps) {
  const [activeDbName, setActiveDbName] = useState<string | null>(null)
  const [activeDb, setActiveDb] = useState<Database | null>(null)
  const [drizzleDb, setDrizzleDb] = useState<SQLJsDatabase<
    typeof schema
  > | null>(null)
  const [localUser, setLocalUserState] = useState<UserSelectType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with previously active database and user (if any)
  useEffect(() => {
    // Load local user info
    const storedUserJson = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
    console.log('storedUserJson', storedUserJson)
    if (storedUserJson) {
      try {
        const user = JSON.parse(storedUserJson)
        const parsedUser = userLocalStorageSchema.safeParse(user)
        if (parsedUser.success) {
          setLocalUserState({
            ...parsedUser.data,
            createdAt: new Date(parsedUser.data.createdAt),
            updatedAt: new Date(parsedUser.data.updatedAt)
          })
        } else {
          console.error('Failed to parse local user data:', parsedUser.error)
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
        }
      } catch (err) {
        console.error('Failed to parse local user data:', err)
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
      }
    }

    // Load active database
    const storedDbName = localStorage.getItem(LOCAL_STORAGE_ACTIVE_DB_KEY)
    if (storedDbName) {
      setActiveDbName(storedDbName)
      loadDatabase(storedDbName).catch((err) => {
        console.error('Failed to load previously active database:', err)
        // Clear the active database if it fails to load
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_DB_KEY)
        setActiveDbName(null)
      })
    }
  }, [])

  // Load a database by name
  const loadDatabase = async (dbName: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const db = await initSqlDb(dbName)
      if (!db) {
        setError(`Nepodařilo se načíst databázi '${dbName}'.`)
        return false
      }

      // Create drizzle instance
      const drizzleInstance = drizzle(db, { schema })

      setActiveDb(db)
      setDrizzleDb(drizzleInstance)
      // @ts-expect-error
      window.sqldb = drizzleInstance
      setActiveDbName(dbName)
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_DB_KEY, dbName)
      return true
    } catch (err: any) {
      const errorMessage = `Chyba při načítání databáze: ${err.message || 'Neznámá chyba'}`
      setError(errorMessage)
      console.error(errorMessage, err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Set active database
  const setActiveDatabase = async (dbName: string): Promise<boolean> => {
    return loadDatabase(dbName)
  }

  // Clear active database
  const clearActiveDatabase = async () => {
    if (!activeDbName) return

    setActiveDb(null)
    setDrizzleDb(null)
    setActiveDbName(null)
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_DB_KEY)
  }

  // Set local user with generated ID
  const setLocalUser = (userData: Omit<UserSelectType, 'id'>) => {
    const user: UserSelectType = {
      id: createId(), // Generate a unique ID using cuid2
      ...userData
    }
    setLocalUserState(user)
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user))
  }

  // Clear local user
  const clearLocalUser = () => {
    setLocalUserState(null)
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
  }

  const saveDatabase = () => {
    if (activeDb && activeDbName) {
      saveDatabaseToOPFS(activeDb, activeDbName)
    }
  }

  const value = {
    activeDbName,
    activeDb,
    drizzleDb,
    localUser,
    isLoading,
    error,
    setActiveDatabase,
    clearActiveDatabase,
    setLocalUser,
    clearLocalUser,
    saveDatabase
  }

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>
}

// Custom hook to use the DB context
export function useDb() {
  const context = useContext(DbContext)
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider')
  }
  return context
}
