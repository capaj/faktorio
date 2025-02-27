import { Suspense, useEffect, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
// Create Document Component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LandingPage } from './pages/LandingPage'
import { InvoiceDetailPage } from './pages/InvoiceDetail/InvoiceDetailPage'
import { InvoiceList } from './pages/InvoiceList/InvoiceList'
import { trpcClient } from './lib/trpcClient'
import { httpBatchLink } from '@trpc/client'
import { NewInvoice } from './pages/invoice/NewInvoicePage'
import { ContactList } from './pages/ContactList/ContactList'
import { MyInvoicingDetails } from './pages/MyInvoicingDetails'
import { SpinnerContainer } from './components/SpinnerContainer'
import { SuperJSON } from 'superjson'
import { ManifestPage } from './pages/ManifestPage'
import { Toaster } from '@/components/ui/sonner'
import { trpcLinks } from './lib/errorToastLink'
import { EditInvoicePage } from './pages/invoice/EditInvoicePage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsOfServicePage } from './pages/TermsOfService'
import { BlogIndex } from './pages/blog/BlogIndex'
import { BlogPost } from './pages/blog/BlogPost'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { RequestPasswordResetPage } from './pages/RequestPasswordResetPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ManageLoginDetails } from './pages/ManageLoginDetails'

import { ErrorBoundary } from './ErrorBoundary'
import { Header } from './components/Header'

const VITE_API_URL = import.meta.env.VITE_API_URL as string

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

function AppContent() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [location] = useLocation()
  const { isSignedIn, isLoaded, token } = useAuth()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState(
    trpcClient.createClient({
      transformer: SuperJSON,

      links: [
        ...trpcLinks,
        httpBatchLink({
          url: VITE_API_URL,
          async headers() {
            return token
              ? {
                  Authorization: `Bearer ${token}`
                }
              : {}
          }
        })
      ]
    })
  )

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
      <trpcClient.Provider client={trpc} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <div className="flex flex-col min-h-[100dvh]">
              <Header />
              <main className="flex-1">
                <div className="container mx-auto p-4">
                  <Suspense fallback={<SpinnerContainer loading={true} />}>
                    <Switch>
                      <Route
                        path="/"
                        component={isSignedIn ? InvoiceList : LandingPage}
                      />
                      <Route path="/login" component={LoginPage} />
                      <Route path="/signup" component={SignupPage} />
                      <Route
                        path="/request-password-reset"
                        component={RequestPasswordResetPage}
                      />
                      <Route
                        path="/reset-password"
                        component={ResetPasswordPage}
                      />
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

                      {isSignedIn && (
                        <>
                          <Route
                            path="/invoices"
                            component={InvoiceList}
                          ></Route>
                          <Route
                            path="/contacts"
                            component={ContactList}
                          ></Route>
                          <Route
                            path="/contacts/:contactId"
                            component={ContactList}
                          ></Route>
                          <Route
                            path="/new-invoice"
                            component={NewInvoice}
                          ></Route>
                          <Route
                            path="/my-details"
                            component={MyInvoicingDetails}
                          ></Route>
                          <Route
                            path="/manage-login-details"
                            component={ManageLoginDetails}
                          ></Route>
                          <Route
                            path="/invoices/:invoiceId/edit"
                            component={EditInvoicePage}
                          ></Route>
                          <Route
                            path="/invoices/:invoiceId"
                            component={InvoiceDetailPage}
                          ></Route>
                          <Route
                            path="/invoices/:invoiceId/:language"
                            component={InvoiceDetailPage}
                          ></Route>
                        </>
                      )}

                      {/* Default route in a switch */}
                      <Route>404: Bohužel neexistuje!</Route>
                    </Switch>
                  </Suspense>
                </div>
              </main>
            </div>
          </ErrorBoundary>
        </QueryClientProvider>
      </trpcClient.Provider>
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
