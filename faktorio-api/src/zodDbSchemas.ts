import { createInsertSchema } from 'drizzle-zod'
import * as schemas from './schema'
import { z } from 'zod'

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
