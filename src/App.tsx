import { useState } from 'react'

import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { CzechInvoicePDF } from './pages/InvoiceDetail/CzechInvoicePDF'
import { invoiceData } from './invoiceSchema'

// Create Document Component

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react'
import { Box } from './components/Box'

function App() {
  const [count, setCount] = useState(0)

  return (
    // <ChakraProvider>
    <>
      <header>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <div
        className="h-full"
        style={{
          minHeight: '1000pxG',
        }}
      >
        {/* A4 sized */}
        <button className="outline outline-offset-2 outline-blue-500 ...">
          Button A
        </button>
        <div
          className="h-full"
          style={{
            minHeight: '1000px',
          }}
        >
          <PDFViewer
            key={new Date().getTime()}
            showToolbar={false}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <CzechInvoicePDF invoiceData={invoiceData} />
          </PDFViewer>
          <PDFDownloadLink
            document={<CzechInvoicePDF invoiceData={invoiceData} />}
            fileName="somename.pdf"
          >
            {({ blob, url, loading, error }) =>
              loading ? 'Loading document...' : 'Download invoice'
            }
          </PDFDownloadLink>
        </div>
      </div>
    </>

    // </ChakraProvider>
  )
}

export default App
