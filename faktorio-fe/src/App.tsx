import { Suspense, useEffect, useState } from 'react'

import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { CzechInvoicePDF } from './pages/InvoiceDetail/CzechInvoicePDF'
import { invoiceData } from './invoiceSchema'
import { Link, Redirect, Route, Switch, useLocation } from 'wouter'
// Create Document Component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  UserButton
} from '@clerk/clerk-react'
import { Box } from './components/Box'
import { LandingPage } from './components/LandingPage'
import { MountainIcon } from './components/MountainIcon'
import { ButtonLink } from './components/ui/link'
import { useUser } from '@clerk/clerk-react'
import { Spinner } from './components/ui/spinner'
import { Button } from './components/ui/button'
import { InvoiceDetail } from './pages/InvoiceDetail/InvoiceDetail'
import { InvoiceList } from './pages/InvoiceList'
import { trpcClient } from './lib/trpcClient'
import { httpBatchLink } from '@trpc/client'
import { NewInvoice } from './pages/NewInvoice'
import { ContactList } from './pages/ContactList'
import { MyDetails } from './pages/MyDetails'
import { SpinnerContainer } from './components/SpinnerContainer'

const VITE_API_URL = import.meta.env.VITE_API_URL as string

function App() {
  const [count, setCount] = useState(0)
  const { isSignedIn, user, isLoaded } = useUser()

  const [location, navigate] = useLocation()

  const { getToken } = useAuth()

  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState(() =>
    trpcClient.createClient({
      links: [
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
  if (!isLoaded) {
    return <SpinnerContainer loading={true} />
  }

  if (user && location === '/') {
    return <Redirect to="/invoices" />
  }

  return (
    <trpcClient.Provider client={trpc} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="flex flex-col min-h-[100dvh]">
          <header className="px-4 lg:px-6 h-14 flex items-center">
            <ButtonLink
              className="flex items-center justify-center"
              href="/invoices"
            >
              <MountainIcon className="h-6 w-6" />
              <span className="sr-only">Faktorio</span>
            </ButtonLink>
            <nav className="ml-auto flex gap-4 sm:gap-6">
              {isSignedIn ? (
                <>
                  <ButtonLink href="/contacts">Kontakty</ButtonLink>
                  <ButtonLink href="/invoices">Faktury</ButtonLink>
                  <ButtonLink href="/new-invoice">Vystavit fakturu</ButtonLink>
                  <ButtonLink href="/my-details">Moje údaje</ButtonLink>
                  <UserButton />
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
                  <Route path="/" component={LandingPage} />

                  {isSignedIn && (
                    <>
                      <Route path="/invoices" component={InvoiceList}></Route>
                      <Route path="/contacts" component={ContactList}></Route>
                      <Route
                        path="/contacts/:contactId"
                        component={ContactList}
                      ></Route>
                      <Route path="/new-invoice" component={NewInvoice}></Route>
                      <Route path="/my-details" component={MyDetails}></Route>
                      <Route
                        path="/invoices/:invoiceId"
                        component={InvoiceDetail}
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
  )
}

export default App
