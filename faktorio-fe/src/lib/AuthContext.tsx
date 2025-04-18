import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'
import { trpcClient } from './trpcClient'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, Operation, TRPCLink } from '@trpc/client'
import { SuperJSON } from 'superjson'
import { trpcLinks } from './errorToastLink'
import { userT } from '../../../faktorio-api/src/schema'
import { useLocation } from 'wouter'
import { RUN_LOCAL_FIRST } from '@/RUN_LOCAL_FIRST'
import { trpcContext, TrpcContext } from '../../../faktorio-api/src/trpcContext'
import { AppRouter, appRouter } from '../../../faktorio-api/src/trpcRouter'
import { AnyRouter, inferRouterContext } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { TRPCResponseMessage } from '@trpc/server/unstable-core-do-not-import'
import initSqlJs, { Database, SqlValue } from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { initSqlDb } from './initSql'
import * as schema from '../../../faktorio-api/src/schema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import { useDb } from './DbContext'
const VITE_API_URL = import.meta.env.VITE_API_URL

if (!VITE_API_URL) {
  throw new Error('VITE_API_URL must be defined')
}

type User = typeof userT.$inferSelect

interface AuthContextType {
  user: User | null
  token: string | null
  isSignedIn: boolean
  isLoaded: boolean
  login: (
    email: string,
    password: string,
    googleToken?: string
  ) => Promise<void>
  signup: (email: string, fullName: string, password: string) => Promise<void>
  googleSignup: (googleToken: string) => Promise<void>
  logout: (path?: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function storeAuthToken(result: { token: string; user: User }) {
  localStorage.setItem('auth_token', result.token)
  localStorage.setItem('auth_user', JSON.stringify(result.user))
}

// This component handles the actual authentication logic using TRPC hooks
const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('auth_token')
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [location, navigate] = useLocation()
  const utils = trpcClient.useUtils()
  // Get TRPC mutations
  const loginMutation = trpcClient.auth.login.useMutation()
  const signupMutation = trpcClient.auth.signup.useMutation()
  const logoutMutation = trpcClient.auth.logout.useMutation()
  const googleLoginMutation = trpcClient.auth.googleLogin.useMutation()
  const googleSignupMutation = trpcClient.auth.googleSignup.useMutation()

  // Check for token in localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user')

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    setIsLoaded(true)
  }, [])

  const login = useCallback(
    async (email: string, password: string, googleToken?: string) => {
      let result

      if (googleToken) {
        // Login with Google
        result = await googleLoginMutation.mutateAsync({ token: googleToken })
      } else {
        // Login with email/password
        result = await loginMutation.mutateAsync({ email, password })
      }

      setUser(result.user)
      setToken(result.token)
      storeAuthToken(result)
    },
    [loginMutation, googleLoginMutation]
  )

  const signup = useCallback(
    async (email: string, fullName: string, password: string) => {
      const result = await signupMutation.mutateAsync({
        email,
        fullName,
        password
      })
      setUser(result.user)
      setToken(result.token)
      storeAuthToken(result)
    },
    [signupMutation]
  )

  const googleSignup = useCallback(
    async (googleToken: string) => {
      const result = await googleSignupMutation.mutateAsync({
        token: googleToken
      })
      setUser(result.user)
      setToken(result.token)
      storeAuthToken(result)
    },
    [googleSignupMutation]
  )

  const logout = useCallback(
    (path?: string) => {
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')

      utils.invalidate()

      logoutMutation.mutate()
      path && navigate('/')
    },
    [logoutMutation]
  )

  const value = {
    user,
    token,
    isSignedIn: !!user,
    isLoaded,
    login,
    signup,
    googleSignup,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const createCaller = trpcContext.createCallerFactory(appRouter)

interface LocalCallerLinkOptions<TRouter extends AnyRouter> {
  router: TRouter
  onMutation: (mutation: Operation) => void
  createContext: () =>
    | Promise<inferRouterContext<TRouter>>
    | inferRouterContext<TRouter>
}

/**
 * Creates a tRPC link that executes procedures locally using the router's createCaller.
 */
export function createLocalCallerLink<TRouter extends AnyRouter>(
  opts: LocalCallerLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    // @ts-expect-error
    const caller = createCaller(opts.createContext())
    // This function is called for each operation
    return ({ op }) => {
      // Returns an observable for the operation result
      return observable((observer) => {
        const { path, input, type, id } = op

        console.log(op)

        // Asynchronously create the context, then the caller
        Promise.resolve(opts.createContext())
          .then((ctx) => {
            // Use the official createCaller method from the router

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
            const response: TRPCResponseMessage = {
              id,
              error: {
                code: -32603, // Internal error code
                message: cause instanceof Error ? cause.message : String(cause),
                data: {
                  code: 'INTERNAL_SERVER_ERROR',
                  httpStatus: 500,
                  stack: cause instanceof Error ? cause.stack : undefined,
                  path,
                  input,
                  type
                }
              }
            }
            // @ts-expect-error
            observer.next(response)
            observer.complete()
          })

        // No cleanup needed for simple caller execution
        return () => {}
      })
    }
  }
}

export const AuthProvider: React.FC<{
  children: React.ReactNode
  localRun?: {
    user: {
      id: string
      email: string
      fullName: string
    }
    db: LibSQLDatabase<typeof schema>
  }
}> = ({ children, localRun }) => {
  const [queryClient] = useState(() => new QueryClient())
  const { saveDatabase } = useDb()

  const [trpc] = useState<any>(() => {
    if (localRun) {
      return trpcClient.createClient({
        links: [
          createLocalCallerLink({
            onMutation: (mutation) => {
              saveDatabase()
            },
            router: appRouter,
            // @ts-expect-error
            createContext: () => {
              return {
                env: {},
                req: {},
                generateToken: () => Promise.resolve(''),
                sessionId: 'local_session',
                userId: localRun.user.id,
                user: localRun.user,
                db: localRun.db
              }
            }
          })
        ]
      })
    } else {
      return trpcClient.createClient({
        links: [
          ...trpcLinks,
          httpBatchLink({
            transformer: SuperJSON,
            url: VITE_API_URL,
            async headers() {
              const token = localStorage.getItem('auth_token')
              return token
                ? {
                    authorization: `Bearer ${token}`
                  }
                : {}
            }
          })
        ]
      })
    }
  })

  return (
    <trpcClient.Provider client={trpc} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProviderInner>{children}</AuthProviderInner>
      </QueryClientProvider>
    </trpcClient.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// For compatibility with existing code that uses useUser
export const useUser = () => {
  const { user, isSignedIn, isLoaded } = useAuth()
  return { user, isSignedIn, isLoaded }
}
