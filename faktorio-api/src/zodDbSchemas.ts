import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import * as schemas from 'faktorio-db/schema'
import { z } from 'zod/v4'

export const invoiceItemInsertSchema = createInsertSchema(
  schemas.invoiceItemsTb
)
export const userInvoicingDetailsInsertSchema = createInsertSchema(
  schemas.userInvoicingDetailsTb
)
export const userBankAccountInsertSchema = createInsertSchema(
  schemas.userBankAccountsTb
)
export const bankAccountInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  bank_account: z.string().optional(),
  iban: z.string().optional(),
  swift_bic: z.string().optional(),
  qrcode_decoded: z.string().optional(),
  is_default: z.boolean().optional(),
  order: z.number().int().nonnegative().optional()
})
export const invoiceInsertSchema = createInsertSchema(schemas.invoicesTb)
export const contactInsertSchema = createInsertSchema(schemas.contactTb)

export type InsertInvoiceItemType = z.infer<typeof invoiceItemInsertSchema>
export type InsertUserInvoicingDetailsType = z.infer<
  typeof userInvoicingDetailsInsertSchema
>
export type InsertUserBankAccountType = z.infer<
  typeof userBankAccountInsertSchema
>
export type BankAccountInputType = z.infer<typeof bankAccountInputSchema>
export type InsertInvoiceType = z.infer<typeof invoiceInsertSchema>
export type InsertContactType = z.infer<typeof contactInsertSchema>

export const invoiceItemFormSchema = invoiceItemInsertSchema.omit({
  invoice_id: true
})

export const invoiceSelectSchema = createSelectSchema(schemas.invoicesTb)
export type SelectInvoiceType = z.infer<typeof invoiceSelectSchema>

export const userSelectSchema = createSelectSchema(schemas.userT)
