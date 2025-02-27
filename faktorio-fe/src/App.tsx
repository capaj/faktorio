import { Suspense, useEffect, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
// Create Document Component
import { LandingPage } from './pages/LandingPage'
import { InvoiceList } from './pages/InvoiceList/InvoiceList'
import { SpinnerContainer } from './components/SpinnerContainer'
import { ManifestPage } from './pages/ManifestPage'
import { Toaster } from '@/components/ui/sonner'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsOfServicePage } from './pages/TermsOfService'
import { BlogIndex } from './pages/blog/BlogIndex'
import { BlogPost } from './pages/blog/BlogPost'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { RequestPasswordResetPage } from './pages/RequestPasswordResetPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AuthProvider, useAuth } from './lib/AuthContext'

import { ErrorBoundary } from './ErrorBoundary'
import { Header } from './components/Header'
import { SignedInRoutes } from './SignedInRoutes'

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

function AppContent() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [location] = useLocation()
  const { isLoaded, token } = useAuth()

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/blog-content/index.json')
      .then((res) => res.json())
      .then((data) => setBlogPosts(data))
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location])

  if (!isLoaded) {
    return <SpinnerContainer loading={true} />
  }

  return (
    <>
      <ErrorBoundary>
        <div className="flex flex-col min-h-[100dvh]">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto p-4">
              <Suspense fallback={<SpinnerContainer loading={true} />}>
                <Switch>
                  <Route
                    path="/"
                    component={token ? InvoiceList : LandingPage}
                  />
                  <Route path="/login" component={LoginPage} />
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

                  {token && <SignedInRoutes />}

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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
