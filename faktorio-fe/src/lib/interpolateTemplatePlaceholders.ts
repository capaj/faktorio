import { djs } from 'faktorio-shared/src/djs'
import 'dayjs/locale/cs'
import 'dayjs/locale/en'

export const interpolateTemplatePlaceholders = (
  value?: string | null,
  language = 'cs'
) => {
  if (!value) return ''

  const now = djs().locale(language === 'en' ? 'en' : 'cs')
  const replacements: Record<string, string> = {
    '{{month}}': now.format('MMMM'),
    '{{previousMonth}}': now.subtract(1, 'month').format('MMMM'),
    '{{date}}': now.format('YYYY-MM-DD')
  }

  return Object.entries(replacements).reduce((acc, [key, replacement]) => {
    return acc.split(key).join(replacement)
  }, value)
}
