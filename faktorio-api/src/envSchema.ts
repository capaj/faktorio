import { z } from 'zod/v4'

export const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  MAILJET_API_KEY: z.string().min(1),
  MAILJET_API_SECRET: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1)
})

export type Env = z.infer<typeof envSchema>
