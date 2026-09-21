import { describe, expect, it } from 'vitest'
import {
  invoiceEmailLanguage,
  invoiceEmailTemplate
} from 'faktorio-shared/src/invoiceEmail'

const data = { number: '2026-123', dueOn: '2026-09-21', senderName: 'Seller' }

describe('invoice email templates', () => {
  it('uses the contact language before the invoice language, with Czech fallback', () => {
    expect(invoiceEmailLanguage('en', 'cs')).toBe('en')
    expect(invoiceEmailLanguage('cs', 'en')).toBe('cs')
    expect(invoiceEmailLanguage(null, 'en')).toBe('en')
    expect(invoiceEmailLanguage('unsupported')).toBe('cs')
  })
  it.each(['cs', 'en'] as const)(
    'provides invoice and reminder text in %s',
    (language) => {
      const invoice = invoiceEmailTemplate(data, language, 'invoice')
      const reminder = invoiceEmailTemplate(data, language, 'reminder')
      expect(invoice.subject).toContain(data.number)
      expect(reminder.subject).toContain(data.number)
      expect(invoice.body).toContain(
        language === 'cs' ? '21. 9. 2026' : data.dueOn
      )
      expect(reminder.body).toContain(
        language === 'cs' ? 'neuhrazenou' : 'remains unpaid'
      )
      expect(invoice.body).toContain(data.senderName)
      expect(reminder.body).not.toBe(invoice.body)
    }
  )
})
