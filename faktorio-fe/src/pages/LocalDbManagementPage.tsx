import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'
import {
  getTrackedDbFiles,
  createNewDatabase,
  deleteDatabase
} from '../lib/initSql'
import { useDb } from '../lib/DbContext'
import { useAuth } from '../lib/AuthContext'

export function LocalDbManagementPage() {
  const [dbFiles, setDbFiles] = useState<string[]>([])
  const [newDbName, setNewDbName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [, navigate] = useLocation()

  // User form state
  const [userFullName, setUserFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSavingUser, setIsSavingUser] = useState(false)

  const {
    activeDbName,
    setActiveDatabase,
    isLoading: isDbLoading,
    localUser,
    setLocalUser
  } = useDb()
  const { isSignedIn } = useAuth()

  // Initialize form with existing user data
  useEffect(() => {
    if (localUser) {
      setUserFullName(localUser.fullName)
      setUserEmail(localUser.email)
    }
  }, [localUser])

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      // Primarily rely on tracked files, but could cross-check with OPFS
      const trackedFiles = getTrackedDbFiles()
      // const opfsFiles = await listOpfsFiles() // Optional: Cross-check/sync
      setDbFiles(trackedFiles)
    } catch (err) {
      console.error('Error loading database files:', err)
      setError('Nepodařilo se načíst seznam databázových souborů.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Auto-hide success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Helper function to store authentication token for local mode
  const storeLocalAuthToken = (user: {
    id: string
    email: string
    fullName: string
  }) => {
    // Create a "fake" token for local mode
    const token = `local_${user.id}`
    // Store auth info in localStorage, similar to how regular login works
    localStorage.setItem('auth_token', token)
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isLocalUser: true // Add a flag to indicate this is a local user
      })
    )
  }

  const handleCreateDb = async () => {
    const trimmedName = newDbName.trim()
    if (!trimmedName) {
      setError('Název databáze nemůže být prázdný.')
      return
    }

    // Basic validation for filename characters (optional but good practice)
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedName)) {
      setError(
        'Název databáze může obsahovat pouze písmena, číslice, podtržítka a pomlčky.'
      )
      return
    }

    const filename = `${trimmedName}.sqlite`

    // Check if file already exists in the tracked list
    if (dbFiles.includes(filename)) {
      setError(`Databáze '${filename}' již existuje.`)
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      console.log(`Creating database: ${filename}`)
      const db = await createNewDatabase(filename)
      if (db) {
        // Successfully created, refresh the list
        await loadFiles()
        setNewDbName('') // Clear input
        setSuccess(`Databáze '${filename}' byla úspěšně vytvořena.`)
      } else {
        setError(
          `Nepodařilo se vytvořit databázi '${filename}'. Zkontrolujte konzoli pro detaily.`
        )
      }
    } catch (err: any) {
      console.error('Error creating database:', err)
      setError(
        `Nepodařilo se vytvořit databázi: ${err.message || 'Neznámá chyba'}`
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleLoadDb = async (filename: string) => {
    setError(null)
    setSuccess(null)

    try {
      const result = await setActiveDatabase(filename)
      if (result) {
        setSuccess(
          `Databáze '${filename}' byla úspěšně načtena a nastavena jako aktivní.`
        )

        // If we have local user info, set up auth token
        if (localUser) {
          storeLocalAuthToken(localUser)

          // Reload page after short delay to refresh auth state
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        setError(`Nepodařilo se načíst databázi '${filename}'.`)
      }
    } catch (err: any) {
      console.error('Error loading database:', err)
      setError(`Chyba při načítání databáze: ${err.message || 'Neznámá chyba'}`)
    }
  }

  const handleDeleteDb = async (filename: string) => {
    if (!confirm(`Opravdu chcete smazat databázi '${filename}'?`)) {
      return
    }

    setError(null)
    setSuccess(null)
    setIsDeleting(filename)
    try {
      const success = await deleteDatabase(filename)
      if (success) {
        await loadFiles() // Refresh the list
        setSuccess(`Databáze '${filename}' byla úspěšně smazána.`)

        // If we deleted the active database, clear auth token
        if (filename === activeDbName) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          // Reload page after short delay
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        setError(`Nepodařilo se smazat databázi '${filename}'.`)
      }
    } catch (err: any) {
      console.error('Error deleting database:', err)
      setError(`Chyba při mazání databáze: ${err.message || 'Neznámá chyba'}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSaveUser = () => {
    if (!userFullName.trim() || !userEmail.trim()) {
      setError('Jméno a e-mail jsou povinné údaje.')
      return
    }

    if (!userEmail.includes('@')) {
      setError('Zadejte platnou e-mailovou adresu.')
      return
    }

    setIsSavingUser(true)
    setError(null)
    try {
      // Create and save the user
      const userData = {
        fullName: userFullName.trim(),
        email: userEmail.trim()
      }
      setLocalUser(userData)

      // Wait for next render when localUser will be updated
      setTimeout(() => {
        // If we have an active database, set up auth token
        if (activeDbName && localUser) {
          storeLocalAuthToken(localUser)
          setSuccess(
            'Uživatelské údaje byly úspěšně uloženy. Přesměrování na hlavní stránku...'
          )

          // Navigate to home page after short delay
          setTimeout(() => {
            navigate('/')
          }, 1500)
        } else {
          setSuccess('Uživatelské údaje byly úspěšně uloženy.')
        }
        setIsSavingUser(false)
      }, 100)
    } catch (err: any) {
      console.error('Error saving user:', err)
      setError(
        `Nepodařilo se uložit uživatelské údaje: ${err.message || 'Neznámá chyba'}`
      )
      setIsSavingUser(false)
    }
  }

  const renderUserForm = () => {
    if (isSignedIn) {
      return (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>
            Jste přihlášeni pomocí standardního účtu. Nastavení údajů pro
            lokální databázi není potřeba.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
        <h2 className="text-xl">Nastavení uživatelských údajů</h2>
        <p className="text-sm text-gray-600">
          Pro používání lokální databáze potřebujete nastavit vaše údaje. Tyto
          údaje budou použity pouze lokálně.
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium">
              Celé jméno
            </label>
            <input
              id="fullName"
              type="text"
              value={userFullName}
              onChange={(e) => setUserFullName(e.target.value)}
              placeholder="Jan Novák"
              className="mt-1 block w-full border p-2 rounded"
              disabled={isSavingUser}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="jan.novak@example.com"
              className="mt-1 block w-full border p-2 rounded"
              disabled={isSavingUser}
            />
          </div>

          <button
            onClick={handleSaveUser}
            disabled={isSavingUser || !userFullName.trim() || !userEmail.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50 transition-colors w-full"
          >
            {isSavingUser ? 'Ukládám...' : 'Uložit údaje'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Správa lokálních databází</h1>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {activeDbName && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <span className="font-bold">Aktivní databáze:</span>{' '}
          <span className="font-mono">{activeDbName}</span>
        </div>
      )}

      {renderUserForm()}

      <div className="space-y-2">
        <h2 className="text-xl">Vytvořit novou databázi</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
            placeholder="Zadejte název databáze (např. muj_projekt)"
            className="border p-2 flex-grow rounded"
            disabled={isCreating}
          />
          <button
            onClick={handleCreateDb}
            disabled={isCreating || !newDbName.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50 transition-colors"
          >
            {isCreating ? 'Vytvářím...' : 'Vytvořit .sqlite'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl">Existující databáze</h2>
        {loading ? (
          <p>Načítám seznam...</p>
        ) : dbFiles.length === 0 ? (
          <p>Nebyly nalezeny žádné lokální databáze. Vytvořte nějakou výše.</p>
        ) : (
          <ul className="divide-y">
            {dbFiles.map((file) => (
              <li
                key={file}
                className="py-2 flex items-center justify-between group"
              >
                <span className="font-mono flex items-center">
                  {file}
                  {activeDbName === file && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Aktivní
                    </span>
                  )}
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleLoadDb(file)}
                    disabled={
                      isDbLoading ||
                      isDeleting === file ||
                      activeDbName === file
                    }
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                  >
                    {isDbLoading && activeDbName !== file
                      ? 'Načítám...'
                      : 'Načíst'}
                  </button>
                  <button
                    onClick={() => handleDeleteDb(file)}
                    disabled={isDbLoading || isDeleting === file}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                  >
                    {isDeleting === file ? 'Mažu...' : 'Smazat'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
