import { Suspense } from 'react'
import { Route } from 'wouter'
// Create Document Component
import { InvoiceDetailPage } from './pages/InvoiceDetail/InvoiceDetailPage'
import { InvoiceListPage } from './pages/InvoiceList/InvoiceListPage'
import { NewInvoice } from './pages/invoice/NewInvoicePage'
import { ContactList } from './pages/ContactList/ContactList'
import { MyInvoicingDetails } from './pages/MyInvoicingDetails'
import { EditInvoicePage } from './pages/invoice/EditInvoicePage'
import { ManageLoginDetails } from './pages/ManageLoginDetails'
import { ReceivedInvoicesPage } from './pages/ReceivedInvoicesPage'
import { SpinnerContainer } from './components/SpinnerContainer'
import { useAuth } from './lib/AuthContext'
import { XMLExportPage } from './pages/XMLExportPage/XMLExportPage'
import { SettingsPage } from './pages/SettingsPage'

export const SignedInRoutes = () => {
  const { token } = useAuth()
  const isLocalUser = token?.startsWith('local_')
  return (
    <>
      <Suspense fallback={<SpinnerContainer loading={true} />}>
        <Route path="/invoices" component={InvoiceListPage}></Route>
        <Route path="/contacts" component={ContactList}></Route>
        <Route path="/contacts/:contactId" component={ContactList}></Route>
        <Route path="/new-invoice" component={NewInvoice}></Route>
        {!isLocalUser && (
          <Route
            path="/received-invoices"
            component={ReceivedInvoicesPage}
          ></Route>
        )}
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
        <Route path="/xml-export" component={XMLExportPage}></Route>
        <Route path="/settings" component={SettingsPage}></Route>
      </Suspense>
    </>
  )
}
