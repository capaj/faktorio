import { Suspense } from 'react'
import { Route } from 'wouter'
// Create Document Component
import { InvoiceDetailPage } from './pages/InvoiceDetail/InvoiceDetailPage'
import { InvoiceList } from './pages/InvoiceList/InvoiceList'
import { NewInvoice } from './pages/invoice/NewInvoicePage'
import { ContactList } from './pages/ContactList/ContactList'
import { MyInvoicingDetails } from './pages/MyInvoicingDetails'
import { EditInvoicePage } from './pages/invoice/EditInvoicePage'
import { ManageLoginDetails } from './pages/ManageLoginDetails'
import { ReceivedInvoicesPage } from './pages/ReceivedInvoicesPage'
import { SpinnerContainer } from './components/SpinnerContainer'

export const SignedInRoutes = () => {
  return (
    <>
      <Suspense fallback={<SpinnerContainer loading={true} />}>
        <Route path="/invoices" component={InvoiceList}></Route>
        <Route path="/contacts" component={ContactList}></Route>
        <Route path="/contacts/:contactId" component={ContactList}></Route>
        <Route path="/new-invoice" component={NewInvoice}></Route>
        <Route
          path="/received-invoices"
          component={ReceivedInvoicesPage}
        ></Route>
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
    </>
  )
}
