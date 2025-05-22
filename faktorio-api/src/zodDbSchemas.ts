import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import * as schemas from './schema'
import { z } from 'zod/v4'

export const insertSchemas = Object.entries(schemas).reduce(
  (acc, [key, value]) => {
    // @ts-expect-error
    acc[key] = createInsertSchema(value)
    return acc
  },
  {} as Record<keyof typeof schemas, z.ZodSchema<any>>
)

export const invoiceItemInsertSchema = createInsertSchema(
  schemas.invoiceItemsTb
)
export const userInvoicingDetailsInsertSchema = createInsertSchema(
  schemas.userInvoicingDetailsTb
)
export const invoiceInsertSchema = createInsertSchema(schemas.invoicesTb)
export const contactInsertSchema = createInsertSchema(schemas.contactTb)

export type InsertInvoiceItemType = z.infer<typeof invoiceItemInsertSchema>
export type InsertUserInvoicingDetailsType = z.infer<
  typeof userInvoicingDetailsInsertSchema
>
export type InsertInvoiceType = z.infer<typeof invoiceInsertSchema>
export type InsertContactType = z.infer<typeof contactInsertSchema>

export const invoiceItemFormSchema = invoiceItemInsertSchema.omit({
  invoice_id: true
})

export const invoiceSelectSchema = createSelectSchema(schemas.invoicesTb)
export type SelectInvoiceType = z.infer<typeof invoiceSelectSchema>
