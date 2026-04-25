import { createId } from '@paralleldrive/cuid2'
import { getOpfsRoot } from './local-db/initSql'

const LOCAL_LOGO_PREFIX = 'opfs-logo://'
const LOGO_DIRECTORY = 'invoice-logos'

const readFileAsDataUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read logo file'))
    reader.readAsDataURL(file)
  })
}

const getLogoFileName = (logoUrl: string): string | null => {
  if (!logoUrl.startsWith(LOCAL_LOGO_PREFIX)) {
    return null
  }
  return logoUrl.slice(LOCAL_LOGO_PREFIX.length) || null
}

export const isLocalLogoUrl = (logoUrl?: string | null) =>
  Boolean(logoUrl && logoUrl.startsWith(LOCAL_LOGO_PREFIX))

export const saveLogoToLocalFs = async (
  file: File,
  userId: string
): Promise<string> => {
  const root = await getOpfsRoot()
  const logosDir = await root.getDirectoryHandle(LOGO_DIRECTORY, {
    create: true
  })
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${userId}_${createId()}_${safeName}`

  const fileHandle = await logosDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file)
  await writable.close()

  return `${LOCAL_LOGO_PREFIX}${fileName}`
}

export const deleteLocalLogo = async (logoUrl?: string | null) => {
  const fileName = logoUrl ? getLogoFileName(logoUrl) : null
  if (!fileName) {
    return
  }

  const root = await getOpfsRoot()
  const logosDir = await root.getDirectoryHandle(LOGO_DIRECTORY, {
    create: true
  })

  try {
    await logosDir.removeEntry(fileName)
  } catch (error) {
    if ((error as DOMException).name !== 'NotFoundError') {
      throw error
    }
  }
}

export const resolveLogoForDisplay = async (
  logoUrl?: string | null
): Promise<string | null> => {
  if (!logoUrl) {
    return null
  }

  const fileName = getLogoFileName(logoUrl)
  if (!fileName) {
    return logoUrl
  }

  const root = await getOpfsRoot()
  const logosDir = await root.getDirectoryHandle(LOGO_DIRECTORY, {
    create: true
  })
  const fileHandle = await logosDir.getFileHandle(fileName)
  const file = await fileHandle.getFile()

  return readFileAsDataUrl(file)
}
