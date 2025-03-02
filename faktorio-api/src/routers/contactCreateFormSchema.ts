import { z } from 'zod'
import { contactInsertSchema } from '../zodDbSchemas'

export const contactCreateFormSchema = contactInsertSchema
  .omit({
    id: true,
    user_id: true,
    created_at: true,
    updated_at: true
  })
  .extend({
    name: z.string(),
    registration_no: z.string().optional(),
    vat_no: z.string().optional(),
    street: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    bank_account: z.string().optional(),
    iban: z.string().optional(),
    web: z.string().optional(),
    variable_symbol: z.string().optional(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
    main_email: z.string().nullish(),
    email: z.string().optional(),
    email_copy: z.string().optional(),
    private_note: z.string().optional(),
    type: z.string().optional(),
    due: z.number().optional(),
    currency: z.string().optional(),
    language: z.string().optional()
  })
