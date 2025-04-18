import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'wouter'
import {
  getTrackedDbFiles,
  createNewDatabase,
  deleteDatabase,
  exportDatabaseFile,
  importDatabaseFile
} from '../lib/initSql'
import { useDb } from '../lib/DbContext'
import { useAuth } from '../lib/AuthContext'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Download, Upload, Database, LogOut } from 'lucide-react'

export function LocalDbManagementPage() {
  const [dbFiles, setDbFiles] = useState<string[]>([])
  const [newDbName, setNewDbName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, navigate] = useLocation()

  // User form state
  const [userFullName, setUserFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSavingUser, setIsSavingUser] = useState(false)

  const {
    activeDbName,
    setActiveDatabase,
    clearActiveDatabase,
    isLoading: isDbLoading,
    localUser,
    setLocalUser
  } = useDb()
  const { token, logout } = useAuth()
  const isLocalUser = token?.startsWith('local_')

  // Initialize default user if none exists
  useEffect(() => {
    if (!localUser) {
      const defaultUser = {
        fullName: 'uzivatel',
        email: ''
      }
      setLocalUser(defaultUser)
      setUserFullName(defaultUser.fullName)
      setUserEmail(defaultUser.email)
    } else {
      setUserFullName(localUser.fullName)
      setUserEmail(localUser.email)
    }
  }, [localUser, setLocalUser])

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

    // Check if user details are set before allowing database activation
    if (!localUser) {
      setError('Před načtením databáze musíte nastavit uživatelské údaje.')
      return
    }

    try {
      const result = await setActiveDatabase(filename)
      if (result) {
        // If we have local user info, set up auth token

        storeLocalAuthToken(localUser)

        setSuccess(
          `Databáze '${filename}' byla úspěšně načtena a nastavena jako aktivní.`
        )
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
      // If we're deleting the active database, deactivate it first
      if (filename === activeDbName) {
        clearActiveDatabase()
      }

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

  const handleDeactivateDb = async () => {
    if (!activeDbName) return

    setError(null)
    setSuccess(null)
    setIsDeactivating(true)

    try {
      // Clear the active database in DbContext
      clearActiveDatabase()

      logout()

      setSuccess(`Databáze '${activeDbName}' byla deaktivována.`)
    } catch (err: any) {
      console.error('Error deactivating database:', err)
      setError(
        `Chyba při deaktivaci databáze: ${err.message || 'Neznámá chyba'}`
      )
    } finally {
      setIsDeactivating(false)
    }
  }

  const handleSaveUser = () => {
    if (!userFullName.trim()) {
      setError('Jméno je povinný údaj.')
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
      setSuccess('Uživatelské údaje byly úspěšně uloženy.')
      setIsSavingUser(false)
    } catch (err: any) {
      console.error('Error saving user:', err)
      setError(
        `Nepodařilo se uložit uživatelské údaje: ${err.message || 'Neznámá chyba'}`
      )
      setIsSavingUser(false)
    }
  }

  const handleExportDb = async (filename: string) => {
    setError(null)
    setSuccess(null)
    setIsExporting(filename)
    try {
      const result = await exportDatabaseFile(filename)
      if (result) {
        setSuccess(`Databáze '${filename}' byla úspěšně exportována.`)
      } else {
        setError(`Nepodařilo se exportovat databázi '${filename}'.`)
      }
    } catch (err: any) {
      console.error('Error exporting database:', err)
      setError(`Chyba při exportu databáze: ${err.message || 'Neznámá chyba'}`)
    } finally {
      setIsExporting(null)
    }
  }

  const handleImportDb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setError(null)
    setSuccess(null)
    setIsImporting(true)

    try {
      const result = await importDatabaseFile(file)
      if (result) {
        await loadFiles() // Refresh the list
        setSuccess(`Databáze '${file.name}' byla úspěšně importována.`)
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(`Nepodařilo se importovat databázi '${file.name}'.`)
      }
    } catch (err: any) {
      console.error('Error importing database:', err)
      setError(`Chyba při importu databáze: ${err.message || 'Neznámá chyba'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const renderUserForm = () => {
    if (token && !isLocalUser) {
      return (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>
            Jste přihlášeni pomocí standardního účtu. Pro nastavení údajů pro
            lokální databázi se odhlašte.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-xl">Nastavení uživatelských údajů</h3>
        <p className="text-sm text-gray-600">
          Pro používání lokální databáze potřebujete nastavit vaše údaje. Tyto
          údaje budou použity pouze lokálně.
        </p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium">
              Celé jméno
            </Label>
            <Input
              id="fullName"
              type="text"
              value={userFullName}
              onChange={(e) => setUserFullName(e.target.value)}
              placeholder="Jan Novák"
              className="mt-1"
              disabled={isSavingUser}
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="jan.novak@example.com"
              className="mt-1"
              disabled={isSavingUser}
            />
          </div>

          <Button
            onClick={handleSaveUser}
            disabled={isSavingUser || !userFullName.trim()}
            className="w-full"
          >
            {isSavingUser ? 'Ukládám...' : 'Uložit údaje'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Správa lokálních databází</h3>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* User form always visible when not authenticated or when in local mode */}
      {(!token || isLocalUser) && !activeDbName && renderUserForm()}

      {activeDbName && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded flex justify-between items-center">
          <div>
            <span className="font-bold">Aktivní databáze:</span>{' '}
            <span className="font-mono">{activeDbName}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivateDb}
            disabled={isDeactivating}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isDeactivating ? 'Deaktivuji...' : 'Deaktivovat'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xl">Existující databáze</h3>
        {loading ? (
          <p>Načítám seznam...</p>
        ) : dbFiles.length === 0 ? (
          <p>Nebyly nalezeny žádné lokální databáze. Vytvořte nějakou níže.</p>
        ) : (
          <ul className="divide-y">
            {dbFiles.map((file) => (
              <li
                key={file}
                className="py-2 flex items-center justify-between group"
              >
                <span className="font-mono flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  {file}
                  {activeDbName === file && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Aktivní
                    </span>
                  )}
                </span>
                <div className="space-x-2">
                  <Button
                    onClick={() => handleLoadDb(file)}
                    disabled={
                      isDbLoading ||
                      isDeleting === file ||
                      activeDbName === file ||
                      isExporting === file
                    }
                    variant="default"
                    size="sm"
                  >
                    {isDbLoading && activeDbName !== file
                      ? 'Načítám...'
                      : 'Načíst'}
                  </Button>
                  <Button
                    onClick={() => handleExportDb(file)}
                    disabled={isExporting === file}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {isExporting === file ? 'Exportuji...' : 'Export'}
                  </Button>
                  <Button
                    onClick={() => handleDeleteDb(file)}
                    disabled={
                      isDbLoading || isDeleting === file || isExporting === file
                    }
                    variant="destructive"
                    size="sm"
                  >
                    {isDeleting === file ? 'Mažu...' : 'Smazat'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl">Vytvořit novou databázi</h3>
        <div className="flex space-x-2">
          <Input
            type="text"
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
            placeholder="Zadejte název databáze (např. muj_projekt)"
            className="flex-grow"
            disabled={isCreating}
          />
          <Button
            onClick={handleCreateDb}
            disabled={isCreating || !newDbName.trim()}
            variant="default"
          >
            {isCreating ? 'Vytvářím...' : 'Vytvořit .sqlite'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl">Importovat databázi</h3>
        <div className="flex space-x-2 items-center">
          <Input
            type="file"
            ref={fileInputRef}
            accept=".sqlite"
            onChange={handleImportDb}
            disabled={isImporting}
            className="flex-grow"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importuji...' : 'Importovat'}
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Vyberte soubor .sqlite pro import do aplikace.
        </p>
      </div>
    </div>
  )
}
