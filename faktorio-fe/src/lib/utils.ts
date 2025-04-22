import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to format date as DD.MM.YYYY
export function formatCzechDate(dateString: string | null | Date): string {
  if (!dateString) return ''
  try {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString
    // Check if date is valid before formatting
    if (isNaN(date.getTime())) return ''
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  } catch (e) {
    console.error('Error formatting date:', dateString, e)
    return '' // Return empty string on error
  }
}

// Helper function to format numbers for XML (integer)
export function formatXmlNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  // Round to nearest integer and convert to string
  return Math.round(num).toString()
}
