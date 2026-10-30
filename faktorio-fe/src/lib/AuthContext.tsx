import React, { createContext, useContext, useState, useCallback } from 'react'
import { trpcClient } from './trpcClient'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, type TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import { SuperJSON } from 'superjson'
import { trpcLinks } from './errorToastLink'
import type { userT } from 'faktorio-db/schema'
import { useLocation } from 'wouter'

import type { AppRouter } from 'faktorio-api/src/trpcRouter'
import type * as schema from 'faktorio-db/schema'
import type { SQLJsDatabase } from 'drizzle-orm/sql-js'
import { useDb } from './local-db/DbContext'
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
  // Read the session synchronously so the first render is already the right page
  // (and the landing page can be prerendered at build time, where there is no localStorage)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof localStorage === 'undefined') return null
    const storedUser = localStorage.getItem('auth_user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('auth_token')
  )
  const isLoaded = true
  const [, navigate] = useLocation()
  const utils = trpcClient.useUtils()
  // Get TRPC mutations
  const loginMutation = trpcClient.auth.login.useMutation()
  const signupMutation = trpcClient.auth.signup.useMutation()
  const logoutMutation = trpcClient.auth.logout.useMutation()
  const googleLoginMutation = trpcClient.auth.googleLogin.useMutation()
  const googleSignupMutation = trpcClient.auth.googleSignup.useMutation()

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

      if (path) navigate('/')
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

/** A link whose implementation is imported on first use */
function lazyLink(
  load: () => Promise<TRPCLink<AppRouter>>
): TRPCLink<AppRouter> {
  return (runtime) => {
    const operationLink = load().then((link) => link(runtime))
    return ({ op, next }) =>
      observable((observer) => {
        let unsubscribe = () => {}
        operationLink.then(
          (link) => {
            unsubscribe = link({ op, next }).subscribe(observer).unsubscribe
          },
          (error) => observer.error(error)
        )
        return () => unsubscribe()
      })
  }
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
      // The whole API router runs in the browser in local mode; load it only then
      return trpcClient.createClient({
        links: [
          lazyLink(() =>
            import('./createLocalCallerLink').then(({ createLocalRunLink }) =>
              createLocalRunLink(localRun, saveDatabase)
            )
          )
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
