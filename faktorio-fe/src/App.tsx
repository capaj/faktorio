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
import { PocPage } from './pages/dev/poc'
import { appRouter } from '../../faktorio-api/src/trpcRouter'
import { RUN_LOCAL_FIRST } from './RUN_LOCAL_FIRST'
import { tc } from '../../faktorio-api/src/trpcContext'
import { initSqlDb } from './lib/initSql'
const VITE_API_URL = import.meta.env.VITE_API_URL as string

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

const createCaller = tc.createCallerFactory(appRouter)

function App() {
  const [count, setCount] = useState(0)
  const { isSignedIn, user, isLoaded } = useUser()
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [location] = useLocation()
  const { isLoaded, token } = useAuth()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState<any>(() => {
    if (RUN_LOCAL_FIRST) {
      const caller = createCaller({
        sessionId: '123',
        userId: '123',
        db: {}
      })

      caller.test().then((res) => {
        console.log(res)
      })
      return caller
    } else {
      return trpcClient.createClient({
        transformer: SuperJSON,

        links: [
          ...trpcLinks,
          httpBatchLink({
            url: VITE_API_URL,
            // You can pass any HTTP headers you wish here
            async headers() {
              const token = await getToken()

              return {
                authorization: `Bearer ${token}`
              }
            }
          })
        ]
      })
    }
  })

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

                          <ButtonLink
                            className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                            href="/new-invoice"
                          >
                            Vystavit fakturu
                          </ButtonLink>

                          <ButtonLink
                            className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                            href="/my-details"
                          >
                            Moje údaje
                          </ButtonLink>
                        </SheetContent>
                      </Sheet>
                    </>
                  ) : (
                    <SignInButton>
                      <Button
                        variant="link"
                        className="text-sm font-medium hover:underline underline-offset-4"
                      >
                        Přihlásit se
                      </Button>
                    </SignInButton>
                  )}
                </nav>
              </header>
              <main className="flex-1">
                <div className="container mx-auto p-4">
                  <Suspense fallback={<SpinnerContainer loading={true} />}>
                    <Switch>
                      <Route
                        path="/"
                        component={isSignedIn ? InvoiceList : LandingPage}
                      />
                      <Route path="/blog">
                        {() => <BlogIndex posts={blogPosts} />}
                      </Route>
                      <Route path="/blog/:slug">
                        {(params) => <BlogPost slug={params.slug} />}
                      </Route>
                      <Route path="/manifest">{() => <ManifestPage />}</Route>
                      <Route path="/privacy">{() => <PrivacyPage />}</Route>
                      <Route path="/poc">{() => <PocPage />}</Route>
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
                            component={MyDetails}
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
