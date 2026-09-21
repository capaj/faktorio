import { z } from 'zod/v4'
import type { SendEmail } from '@cloudflare/workers-types'

type InvoiceLogoBucket = {
  put: (key: string, value: unknown, options?: unknown) => Promise<unknown>
}

export const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  // Supplied by Wrangler, not process.env; absent in browser-only local mode.
  SEND_EMAIL: z.custom<SendEmail>().optional(),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
  INVOICE_LOGO_PUBLIC_BASE_URL: z.string().url().optional(),
  INVOICE_LOGO_BUCKET: z.custom<InvoiceLogoBucket>().optional()
})

export type Env = z.infer<typeof envSchema>
