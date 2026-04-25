import { z } from 'zod/v4'

type InvoiceLogoBucket = {
  put: (key: string, value: unknown, options?: unknown) => Promise<unknown>
}

export const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  MAILJET_API_KEY: z.string().min(1),
  MAILJET_API_SECRET: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
  INVOICE_LOGO_PUBLIC_BASE_URL: z.string().url().optional(),
  INVOICE_LOGO_BUCKET: z.custom<InvoiceLogoBucket>().optional()
})

export type Env = z.infer<typeof envSchema>
