import { lazy, Suspense, useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Route, Switch } from 'wouter'
// Create Document Component
import { LandingPage } from './pages/LandingPage'
import { SpinnerContainer } from './components/SpinnerContainer'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from './lib/AuthContext'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { DbProvider, useDb } from './lib/local-db/DbContext'

import { ErrorBoundary } from './ErrorBoundary'
import { Header } from './components/Header'

// Pages are code-split so a visitor only downloads the page they open
const InvoiceListPage = lazy(() =>
  import('./pages/InvoiceList/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage }))
)
const ManifestPage = lazy(() =>
  import('./pages/ManifestPage').then((m) => ({ default: m.ManifestPage }))
)
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
)
const TermsOfServicePage = lazy(() =>
  import('./pages/TermsOfService').then((m) => ({ default: m.TermsOfServicePage }))
)
const BlogIndex = lazy(() =>
  import('./pages/blog/BlogIndex').then((m) => ({ default: m.BlogIndex }))
)
const BlogPost = lazy(() =>
  import('./pages/blog/BlogPost').then((m) => ({ default: m.BlogPost }))
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const SignupPage = lazy(() =>
  import('./pages/SignupPage').then((m) => ({ default: m.SignupPage }))
)
const RequestPasswordResetPage = lazy(() =>
  import('./pages/RequestPasswordResetPage').then((m) => ({ default: m.RequestPasswordResetPage }))
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
)
const SignedInRoutes = lazy(() =>
  import('./SignedInRoutes').then((m) => ({ default: m.SignedInRoutes }))
)
const LocalDbManagementPage = lazy(() =>
  import('./pages/LocalDbManagementPage').then((m) => ({ default: m.LocalDbManagementPage }))
)
const SharedInvoicePage = lazy(() =>
  import('@/pages/SharedInvoicePage').then((m) => ({ default: m.SharedInvoicePage }))
)
import type { UserSelectType } from 'faktorio-db/schema'

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

function AppContent() {
  const { isLoaded } = useUser()
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const { isSignedIn } = useAuth()

  useEffect(() => {
    fetch('/blog-content/index.json')
      .then((res) => res.json())
      .then((data) => setBlogPosts(data))
  }, [])

  if (!isLoaded) {
    return <SpinnerContainer loading={true} />
  }

  return (
    <>
      <ErrorBoundary>
        <div className="flex flex-col min-h-[100dvh]">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-2 py-4 md:p-4">
              <Suspense fallback={<SpinnerContainer loading={true} />}>
                <Switch>
                  <Route
                    path="/"
                    component={isSignedIn ? InvoiceListPage : LandingPage}
                  />
                  <Route path="/login" component={LoginPage} />
                  <Route path="/local-dbs" component={LocalDbManagementPage} />
                  <Route path="/signup" component={SignupPage} />
                  <Route
                    path="/request-password-reset"
                    component={RequestPasswordResetPage}
                  />
                  <Route path="/reset-password" component={ResetPasswordPage} />
                  <Route path="/blog">
                    {() => <BlogIndex posts={blogPosts} />}
                  </Route>
                  <Route path="/blog/:slug">
                    {(params) => <BlogPost slug={params.slug} />}
                  </Route>
                  <Route path="/manifest">{() => <ManifestPage />}</Route>
                  <Route path="/privacy">{() => <PrivacyPage />}</Route>
                  <Route path="/terms-of-service">
                    {() => <TermsOfServicePage />}
                  </Route>
                  {/* public shared invoice route */}
                  <Route path="/shared-invoice/:shareId" component={SharedInvoicePage} />

                  {isSignedIn && <SignedInRoutes />}

                  {/* Default route in a switch */}
                  <Route>404: Bohužel neexistuje!</Route>
                </Switch>
              </Suspense>
            </div>
          </main>
        </div>
      </ErrorBoundary>

      <Toaster />
    </>
  )
}

function AppWithLocalDb() {
  const { drizzleDb, localUser, isLoading } = useDb()

  // Only set up local configuration when we have both a database and user
  const localRunConfig =
    drizzleDb && localUser
      ? {
        user: {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          passwordHash: null,
          pictureUrl: null,
          googleId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserSelectType,
        db: drizzleDb
      }
      : undefined

  if (isLoading) {
    return <SpinnerContainer loading={true} />
  }
  return (
    <AuthProvider localRun={localRunConfig} key={localRunConfig?.user?.id}>
      <AppContent />
    </AuthProvider>
  )
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DbProvider>
        <AppWithLocalDb />
      </DbProvider>
    </ThemeProvider>
  )
}

export default App
