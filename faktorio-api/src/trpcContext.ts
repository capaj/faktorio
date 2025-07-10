import { initTRPC } from '@trpc/server'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from 'faktorio-db/schema'
import superjson from 'superjson'
import { GoogleAIFileManager } from '@google/generative-ai/server'

import { UserSelectType, userT } from 'faktorio-db/schema'
import { Env } from './envSchema'
import { GoogleGenAI } from '@google/genai'

// JWT secret should be the same as in authRouter

export type TrpcContext = {
  // db: LibSQLDatabase<typeof schema> | SQLJsDatabase<typeof schema> // ideally this, but drizzle types go haywire when we define db like this
  db: LibSQLDatabase<typeof schema>
  env: Env
  user: UserSelectType | undefined
  req: Request
  generateToken: (user: UserSelectType) => Promise<string>
  googleGenAIFileManager: GoogleAIFileManager
  googleGenAI: GoogleGenAI
}
// @ts-ignore
const isBrowser = typeof window !== 'undefined'

export const trpcContext = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  allowOutsideOfServer: isBrowser,
  isServer: !isBrowser
})
