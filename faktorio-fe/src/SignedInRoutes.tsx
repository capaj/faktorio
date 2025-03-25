import { Suspense, useState } from 'react'
import { Route } from 'wouter'
// Create Document Component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvoiceDetailPage } from './pages/InvoiceDetail/InvoiceDetailPage'
import { InvoiceList } from './pages/InvoiceList/InvoiceList'
import { trpcClient } from './lib/trpcClient'
import { httpBatchLink } from '@trpc/client'
import { NewInvoice } from './pages/invoice/NewInvoicePage'
import { ContactList } from './pages/ContactList/ContactList'
import { MyInvoicingDetails } from './pages/MyInvoicingDetails'
import { SuperJSON } from 'superjson'
import { trpcLinks } from './lib/errorToastLink'
import { EditInvoicePage } from './pages/invoice/EditInvoicePage'
import { useAuth } from './lib/AuthContext'
import { ManageLoginDetails } from './pages/ManageLoginDetails'
import { SpinnerContainer } from './components/SpinnerContainer'

const VITE_API_URL = import.meta.env.VITE_API_URL as string

export const SignedInRoutes = () => {
  const { token } = useAuth()

  const [queryClient] = useState(() => new QueryClient())
  const [trpc] = useState(
    trpcClient.createClient({
      links: [
        ...trpcLinks,
        httpBatchLink({
          transformer: SuperJSON,
          url: VITE_API_URL,
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]
    })
  )
  return (
    <>
      <trpcClient.Provider client={trpc} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<SpinnerContainer loading={true} />}>
            <Route path="/invoices" component={InvoiceList}></Route>
            <Route path="/contacts" component={ContactList}></Route>
            <Route path="/contacts/:contactId" component={ContactList}></Route>
            <Route path="/new-invoice" component={NewInvoice}></Route>
            <Route path="/my-details" component={MyInvoicingDetails}></Route>
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
          </Suspense>
        </QueryClientProvider>
      </trpcClient.Provider>
    </>
  )
}
