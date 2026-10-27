import { Operation, TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import { TRPCResponseMessage } from '@trpc/server/unstable-core-do-not-import'
import { inferRouterContext } from '@trpc/server'
import { trpcContext, type TrpcContext } from 'faktorio-api/src/trpcContext'
import { AppRouter, appRouter } from 'faktorio-api/src/trpcRouter'
import * as schema from 'faktorio-db/schema'
import type { userT } from 'faktorio-db/schema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import { SQLJsDatabase } from 'drizzle-orm/sql-js'

export const createCaller: (
  ctx: TrpcContext
) => ReturnType<typeof appRouter.createCaller> =
  trpcContext.createCallerFactory(appRouter)

export interface LocalCallerLinkOptions<TRouter extends AppRouter> {
  router: TRouter
  onMutation: (mutation: Operation) => void
  createContext: () =>
    Promise<inferRouterContext<TRouter>> | inferRouterContext<TRouter>
}

function parseEnvVars(): {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  JWT_SECRET: string
  OPENROUTER_API_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_SUBJECT: string
} {
  const envVarsString = localStorage.getItem('local_env_vars')
  const envVars: Record<string, string> = {}

  if (envVarsString) {
    const lines = envVarsString.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        if (key.trim()) {
          envVars[key.trim()] = value.trim()
        }
      }
    }
  }

  // Provide defaults for required environment variables
  const defaults = {
    TURSO_DATABASE_URL: '',
    TURSO_AUTH_TOKEN: '',
    JWT_SECRET: 'local_secret_key',
    OPENROUTER_API_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_SUBJECT: 'mailto:admin@example.com'
  }

  return {
    TURSO_DATABASE_URL:
      envVars.TURSO_DATABASE_URL || defaults.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: envVars.TURSO_AUTH_TOKEN || defaults.TURSO_AUTH_TOKEN,
    JWT_SECRET: envVars.JWT_SECRET || defaults.JWT_SECRET,
    OPENROUTER_API_KEY:
      envVars.OPENROUTER_API_KEY || defaults.OPENROUTER_API_KEY,
    VAPID_PRIVATE_KEY: envVars.VAPID_PRIVATE_KEY || defaults.VAPID_PRIVATE_KEY,
    VAPID_PUBLIC_KEY: envVars.VAPID_PUBLIC_KEY || defaults.VAPID_PUBLIC_KEY,
    VAPID_SUBJECT: envVars.VAPID_SUBJECT || defaults.VAPID_SUBJECT
  }
}

/**
 * Creates a tRPC link that executes procedures locally using the router's createCaller.
 */
export function createLocalCallerLink<TRouter extends AppRouter>(
  opts: LocalCallerLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    // This function is called for each operation
    return ({ op }) => {
      // Returns an observable for the operation result
      return observable((observer) => {
        const { path, input, type, id } = op

        // Asynchronously create the context, then the caller
        Promise.resolve(opts.createContext())
          .then((ctx) => {
            // Create the caller with the resolved context
            const caller = createCaller(ctx)
            // Dynamically access the procedure function on the caller
            const procedureFn = path
              .split('.')
              .reduce(
                (obj, key) => obj?.[key as keyof typeof obj],
                caller as any
              )

            if (typeof procedureFn !== 'function') {
              throw new Error(`Procedure not found at path: ${path}`)
            }

            // Execute the procedure
            return procedureFn(input)
          })
          .then((data) => {
            // Successfully executed
            const response: TRPCResponseMessage = {
              id,
              result: {
                type: 'data',
                data
              }
            }

            if (type === 'mutation') {
              opts.onMutation(op)
            }
            console.debug(response)
            observer.next(response)
            observer.complete()
          })
          .catch((cause) => {
            // Handle errors
            console.error(cause)
            observer.error(cause)
          })

        // No cleanup needed for simple caller execution
        return () => {}
      })
    }
  }
}

/** The tRPC link for local mode: runs the API router in the browser against the local database */
export function createLocalRunLink(
  localRun: {
    user: typeof userT.$inferSelect
    db: SQLJsDatabase<typeof schema>
  },
  saveDatabase: () => void
): TRPCLink<AppRouter> {
  return createLocalCallerLink({
    onMutation: () => {
      saveDatabase()
    },
    router: appRouter,

    createContext: () => {
      const env = parseEnvVars()
      return {
        env,
        req: {} as Request,
        generateToken: () => Promise.resolve(''),
        sendEmail: () => Promise.resolve(),
        user: localRun.user,
        db: localRun.db as any as LibSQLDatabase<typeof schema>, // gotta do this conversion, because drizzle types don't work when we define db as union of LibSQL and SQLJs
        googleGenAIFileManager: {} as any,
        googleGenAI: {} as any
      }
    }
  })
}
