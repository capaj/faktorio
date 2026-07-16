import { describe, expect, it } from 'vitest'
import { upsertInvoicingDetailsSchema } from './trpcRouter'

describe('upsertInvoicingDetailsSchema', () => {
  const validPayload = {
    registration_no: '12345678',
    name: ' Faktorio s.r.o. ',
    street: ' Main 1 ',
    street2: '',
    city: ' Prague ',
    zip: ' 11000 ',
    country: ' Czech Republic ',
    vat_no: '',
    main_email: '',
    phone_number: '',
    web_url: '',
    logo_url: '',
    vat_payer: true,
    bank_accounts: []
  }

  it('trims persisted strings and removes empty optional strings', () => {
    const result = upsertInvoicingDetailsSchema.parse(validPayload)

    expect(result).toMatchObject({
      registration_no: '12345678',
      name: 'Faktorio s.r.o.',
      street: 'Main 1',
      city: 'Prague',
      zip: '11000',
      country: 'Czech Republic',
      street2: undefined,
      vat_no: undefined,
      main_email: undefined,
      phone_number: undefined,
      web_url: undefined,
      logo_url: undefined
    })
  })

  it('rejects blank required invoicing detail fields before the database write', () => {
    const result = upsertInvoicingDetailsSchema.safeParse({
      ...validPayload,
      name: '   '
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['name'])
  })

  it('allows an empty registration number instead of sending it to the database', () => {
    const result = upsertInvoicingDetailsSchema.parse({
      ...validPayload,
      registration_no: ''
    })

    expect(result.registration_no).toBeUndefined()
  })
})
