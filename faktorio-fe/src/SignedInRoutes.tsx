import { lazy, Suspense } from 'react'
import { Route } from 'wouter'
// Create Document Component
import { SpinnerContainer } from './components/SpinnerContainer'
import { useAuth } from './lib/AuthContext'

// Pages are code-split so a visitor only downloads the page they open
const InvoiceDetailPage = lazy(() =>
  import('./pages/InvoiceDetail/InvoiceDetailPage').then((m) => ({
    default: m.InvoiceDetailPage
  }))
)
const InvoiceListPage = lazy(() =>
  import('./pages/InvoiceList/InvoiceListPage').then((m) => ({
    default: m.InvoiceListPage
  }))
)
const NewInvoicePage = lazy(() =>
  import('./pages/invoice/NewInvoicePage').then((m) => ({
    default: m.NewInvoicePage
  }))
)
const ContactList = lazy(() =>
  import('./pages/ContactList/ContactList').then((m) => ({
    default: m.ContactList
  }))
)
const UserInvoicingDetails = lazy(() =>
  import('./pages/UserInvoicingDetails').then((m) => ({
    default: m.UserInvoicingDetails
  }))
)
const EditInvoicePage = lazy(() =>
  import('./pages/invoice/EditInvoicePage').then((m) => ({
    default: m.EditInvoicePage
  }))
)
const ManageLoginDetails = lazy(() =>
  import('./pages/ManageLoginDetails').then((m) => ({
    default: m.ManageLoginDetails
  }))
)
const ReceivedInvoicesPage = lazy(() =>
  import('./pages/ReceivedInvoicesPage').then((m) => ({
    default: m.ReceivedInvoicesPage
  }))
)
const XMLExportPage = lazy(() =>
  import('./pages/XMLExportPage/XMLExportPage').then((m) => ({
    default: m.XMLExportPage
  }))
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const IsdocExportPage = lazy(() =>
  import('./pages/InvoiceDetail/IsdocExportPage').then((m) => ({
    default: m.IsdocExportPage
  }))
)

export const SignedInRoutes = () => {
  const { token } = useAuth()
  const isLocalUser = token?.startsWith('local_')
  return (
    <>
      <Suspense fallback={<SpinnerContainer loading={true} />}>
        <Route path="/invoices" component={InvoiceListPage}></Route>
        <Route path="/contacts" component={ContactList}></Route>
        <Route path="/contacts/:contactId" component={ContactList}></Route>
        <Route path="/new-invoice" component={NewInvoicePage}></Route>
        {!isLocalUser && (
          <Route
            path="/received-invoices"
            component={ReceivedInvoicesPage}
          ></Route>
        )}
        <Route path="/my-details" component={UserInvoicingDetails}></Route>
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
          path="/invoices/:invoiceId/isdoc"
          component={IsdocExportPage}
        ></Route>

        <Route path="/xml-export" component={XMLExportPage}></Route>
        <Route path="/settings" component={SettingsPage}></Route>
      </Suspense>
    </>
  )
}
