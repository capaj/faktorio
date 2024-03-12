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
    registration_no: z.string(),
    name: z.string()
  })
