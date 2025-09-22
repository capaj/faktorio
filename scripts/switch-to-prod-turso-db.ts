#!/usr/bin/env bun
import { readFile, writeFile, cp, access } from 'node:fs/promises'
import { constants } from 'node:fs'

const VARS_PATH = 'faktorio-api/.dev.vars'
const BACKUP_PATH = `${VARS_PATH}.bak`
const SAFETY_BACKUP_PATH = `${VARS_PATH}.current`
const KEYS = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'] as const

type TursoKey = (typeof KEYS)[number]

type BackupMap = Record<TursoKey, string>

async function ensureFile(path: string) {
  try {
    await access(path, constants.R_OK | constants.W_OK)
  } catch {
    throw new Error(`Required file missing or not writable: ${path}`)
  }
}

async function loadBackup(): Promise<BackupMap> {
  const lines = (await readFile(BACKUP_PATH, 'utf8')).split(/\r?\n/)
  const map = {} as BackupMap

  for (const key of KEYS) {
    const line = lines.find((entry) => entry.startsWith(`${key}=`))
    if (!line) {
      throw new Error(`Could not find ${key} in ${BACKUP_PATH}`)
    }
    map[key] = line
  }

  return map
}

async function updateVars(backup: BackupMap) {
  const original = (await readFile(VARS_PATH, 'utf8')).split(/\r?\n/)
  const updated: string[] = []

  for (const line of original) {
    if (KEYS.some((key) => line.startsWith(`# ${key}=`))) {
      continue
    }

    const key = KEYS.find((item) => line.startsWith(`${item}=`))
    if (!key) {
      updated.push(line)
      continue
    }

    const backupLine = backup[key]
    if (line === backupLine) {
      updated.push(line)
      continue
    }

    updated.push(`# ${line} (previous)`)
    updated.push(backupLine)
  }

  await writeFile(VARS_PATH, `${updated.join('\n')}\n`, 'utf8')
}

async function main() {
  try {
    await ensureFile(VARS_PATH)
    await ensureFile(BACKUP_PATH)

    console.log('Creating safety backup of current .dev.vars...')
    await cp(VARS_PATH, SAFETY_BACKUP_PATH)

    console.log('Restoring Turso prod credentials...')
    const backup = await loadBackup()
    await updateVars(backup)

    console.log(
      'Done. Previous values commented with "(previous)" and full backup saved as .dev.vars.current'
    )
  } catch (error) {
    console.error('Failed to switch to prod Turso database:', error)
    process.exit(1)
  }
}

await main()
