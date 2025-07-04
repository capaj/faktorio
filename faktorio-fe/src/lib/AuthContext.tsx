import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'
import { trpcClient } from './trpcClient'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, Operation } from '@trpc/client'
import { SuperJSON } from 'superjson'
import { trpcLinks } from './errorToastLink'
import { userT } from 'faktorio-api/src/schema'
import { useLocation } from 'wouter'

import { trpcContext, type TrpcContext } from 'faktorio-api/src/trpcContext'
import { AppRouter, appRouter } from 'faktorio-api/src/trpcRouter'
import { inferRouterContext } from '@trpc/server'
import * as schema from 'faktorio-api/src/schema'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import { SQLJsDatabase } from 'drizzle-orm/sql-js'
import { useDb } from './local-db/DbContext'
import { createLocalCallerLink } from './createLocalCallerLink'
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
      logoutMutation.mutate()
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')

      utils.invalidate()

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

export const createCaller: (
  ctx: TrpcContext
) => ReturnType<typeof appRouter.createCaller> =
  trpcContext.createCallerFactory(appRouter)

export interface LocalCallerLinkOptions<TRouter extends AppRouter> {
  router: TRouter
  onMutation: (mutation: Operation) => void
  createContext: () =>
    | Promise<inferRouterContext<TRouter>>
    | inferRouterContext<TRouter>
}

export async function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return token
    ? {
        authorization: `Bearer ${token}`
      }
    : {}
}

export const AuthProvider: React.FC<{
  children: React.ReactNode
  localRun?: {
    user: typeof userT.$inferSelect
    db: SQLJsDatabase<typeof schema>
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

            createContext: () => {
              return {
                env: {
                  TURSO_DATABASE_URL: '',
                  TURSO_AUTH_TOKEN: '',
                  JWT_SECRET: '',
                  GEMINI_API_KEY: '',
                  VAPID_PRIVATE_KEY: '',
                  VAPID_PUBLIC_KEY: '',
                  VAPID_SUBJECT: '',
                  MAILJET_API_KEY: '',
                  MAILJET_API_SECRET: ''
                },
                req: {} as Request,
                generateToken: () => Promise.resolve(''),
                user: localRun.user,
                db: localRun.db as any as LibSQLDatabase<typeof schema>, // gotta do this conversion, because drizzle types don't work when we define db as union of LibSQL and SQLJs
                googleGenAIFileManager: {} as any,
                googleGenAI: {} as any
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
            headers: authHeaders
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
