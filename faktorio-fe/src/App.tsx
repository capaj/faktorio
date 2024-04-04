import { Suspense, useEffect, useState } from 'react'
import {
  SheetTrigger,
  SheetContent,
  Sheet,
  SheetClose
} from '@/components/ui/sheet'
import { Redirect, Route, Switch, useLocation } from 'wouter'
// Create Document Component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SignInButton, useAuth, UserButton } from '@clerk/clerk-react'
import { LandingPage } from './pages/LandingPage'
import { MountainIcon } from './components/MountainIcon'
import { ButtonLink } from './components/ui/link'
import { useUser } from '@clerk/clerk-react'
import { Button } from './components/ui/button'
import { InvoiceDetailPage } from './pages/InvoiceDetail/InvoiceDetailPage'
import { InvoiceList } from './pages/InvoiceList/InvoiceList'
import { trpcClient } from './lib/trpcClient'
import { httpBatchLink } from '@trpc/client'
import { NewInvoice } from './pages/invoice/NewInvoicePage'
import { ContactList } from './pages/ContactList/ContactList'
import { MyDetails } from './pages/MyDetails'
import { SpinnerContainer } from './components/SpinnerContainer'
import { SuperJSON } from 'superjson'
import { ManifestPage } from './pages/ManifestPage'
import { Toaster } from '@/components/ui/sonner'
import { trpcLinks } from './lib/errorToastLink'
import { EditInvoicePage } from './pages/invoice/EditInvoicePage'
import { ChevronLeftIcon, LucideMenu } from 'lucide-react'
import { PrivacyPage } from './pages/PrivacyPage'
// import {}
const VITE_API_URL = import.meta.env.VITE_API_URL as string

function App() {
  const [count, setCount] = useState(0)
  const { isSignedIn, user, isLoaded } = useUser()

  const [location, navigate] = useLocation()

  const { getToken } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState(() =>
    trpcClient.createClient({
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
  )
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
          <div className="flex flex-col min-h-[100dvh]">
            <header className="px-4 lg:px-6 h-14 flex items-center">
              <ButtonLink
                className="flex items-center justify-center"
                href={user ? '/invoices' : '/'}
              >
                <MountainIcon className="h-6 w-6" />
                <span className="sr-only">Faktorio</span>
              </ButtonLink>
              <nav className="ml-auto flex gap-4 sm:gap-6">
                {isSignedIn ? (
                  <>
                    <div className="hidden sm:flex lg:flex justify-center items-center">
                      <ButtonLink href="/contacts">Kontakty</ButtonLink>
                      <ButtonLink href="/invoices">Faktury</ButtonLink>
                      <ButtonLink href="/new-invoice">
                        Vystavit fakturu
                      </ButtonLink>
                      <ButtonLink href="/my-details">Moje údaje</ButtonLink>
                      <UserButton />
                    </div>
                    <Sheet
                      open={isMenuOpen}
                      onOpenChange={(open) => {
                        setIsMenuOpen(open)
                      }}
                    >
                      <SheetTrigger asChild>
                        <Button
                          className="border-0 rounded-full p-2 sm:hidden"
                          size="icon"
                          variant="outline"
                        >
                          <LucideMenu className="h-6 w-6" />
                          <span className="sr-only">
                            Toggle navigation menu
                          </span>
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="flex flex-col">
                        <ButtonLink
                          className="inline-flex h-9 items-center justify-start rounded-md px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900  focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                          href="/contacts"
                        >
                          Kontakty
                        </ButtonLink>

                        <ButtonLink
                          className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                          href="/invoices"
                        >
                          Faktury
                        </ButtonLink>

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
                    <Route path="/manifest" component={ManifestPage} />
                    <Route path="/privacy" component={PrivacyPage} />

                    {isSignedIn && (
                      <>
                        <Route path="/invoices" component={InvoiceList}></Route>
                        <Route path="/contacts" component={ContactList}></Route>
                        <Route
                          path="/contacts/:contactId"
                          component={ContactList}
                        ></Route>
                        <Route
                          path="/new-invoice"
                          component={NewInvoice}
                        ></Route>
                        <Route path="/my-details" component={MyDetails}></Route>
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
        </QueryClientProvider>
      </trpcClient.Provider>
      <Toaster />
    </>
  )
}

export default App
