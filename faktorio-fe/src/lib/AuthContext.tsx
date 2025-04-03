import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'
import { trpcClient } from './trpcClient'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { SuperJSON } from 'superjson'
import { trpcLinks } from './errorToastLink'
import { userT } from '../../../faktorio-api/src/schema'
import { useLocation } from 'wouter'

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
  logout: () => void
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

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')

    utils.invalidate()

    logoutMutation.mutate()
    navigate('/')
  }, [logoutMutation])

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState(() =>
    trpcClient.createClient({
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
  )

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
