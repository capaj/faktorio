import { initTRPC } from '@trpc/server'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'
import superjson from 'superjson'
import { GoogleAIFileManager } from '@google/generative-ai/server'

import { userT } from './schema'
import { Env } from '.'
import { GoogleGenAI } from '@google/genai'

// JWT secret should be the same as in authRouter

export type TrpcContext = {
  db: LibSQLDatabase<typeof schema>
  env: Env
  user: typeof userT.$inferSelect | undefined
  req: Request
  generateToken: (user: typeof userT.$inferSelect) => Promise<string>
  googleGenAIFileManager: GoogleAIFileManager
  googleGenAI: GoogleGenAI
}
// @ts-expect-error
const isBrowser = typeof window !== 'undefined'

export const trpcContext = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  allowOutsideOfServer: isBrowser,
  isServer: !isBrowser
})
