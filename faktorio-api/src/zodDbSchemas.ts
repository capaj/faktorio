import { createInsertSchema } from 'drizzle-zod'
import * as schemas from './schema'
import { z } from 'zod'

export const insertSchemas = Object.entries(schemas).reduce(
  (acc, [key, value]) => {
      // @ts-expect-error
    acc[key] = createInsertSchema(value)
    return acc
  },
  {} as Record<keyof typeof schemas, z.ZodSchema<any>>,
)

export const invoiceItemInsertSchema = createInsertSchema(schemas.invoiceItems)
export const userInvoicingDetailsInsertSchema = createInsertSchema(schemas.userInvoicingDetails)
export const invoiceInsertSchema = createInsertSchema(schemas.invoices)

export type InsertInvoiceItemType = z.infer<typeof invoiceItemInsertSchema>
export type InsertUserInvoicingDetailsType = z.infer<typeof userInvoicingDetailsInsertSchema>
export type InsertInvoiceType = z.infer<typeof invoiceInsertSchema>

