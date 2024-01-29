import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import { Box, Center, ChakraProvider } from '@chakra-ui/react'
import React from 'react'
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer
} from '@react-pdf/renderer'
import { InvoicePDF } from './InvoicePDF'

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#E4E4E4'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  }
})

const invoiceData = {
  supplier: {
    name: 'Sample Supplier Inc.',
    address: '123 Supplier Street, Supplier City, SS 12345',
    phone: '123-456-7890',
    email: 'info@suppliersample.com'
  },
  invoiceNumber: '2024-0001',
  issueDate: '2024-01-01',
  dueDate: '2024-02-01',
  customer: {
    name: 'Sample Customer LLC',
    address: '456 Customer Road, Customer City, CC 67890',
    phone: '987-654-3210',
    email: 'contact@customerexample.com'
  },
  items: [
    {
      description: 'Web Development Services',
      quantity: 10,
      unitPrice: 100.0,
      total: 1000.0
    },
    {
      description: 'Web Design',
      quantity: 5,
      unitPrice: 80.0,
      total: 400.0
    }
  ],
  subtotal: 1400.0,
  taxRate: 0.2,
  taxAmount: 280.0,
  total: 1680.0,
  paymentDetails: {
    account: '9876543210',
    IBAN: 'DE89 3704 0044 0532 0130 00',
    bankName: 'Sample Bank',
    swiftCode: 'BKODDEBB'
  },
  additionalNotes: 'Thank you for your business!'
}

// Create Document Component

function App() {
  const [count, setCount] = useState(0)

  return (
    // <ChakraProvider>
    <Box minH={'100vh'} minW={'100vw'} backgroundColor={'gray.200'}>
      {/* A4 sized */}
      <Center h={1132} w={800} backgroundColor={'white'}>
        <PDFViewer
          key={new Date().getTime()}
          showToolbar={false}
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <InvoicePDF invoiceData={invoiceData} />
        </PDFViewer>
        <PDFDownloadLink
          document={<InvoicePDF invoiceData={invoiceData} />}
          fileName="somename.pdf"
        >
          {({ blob, url, loading, error }) =>
            loading ? 'Loading document...' : 'Download invoice'
          }
        </PDFDownloadLink>
      </Center>
    </Box>
    // </ChakraProvider>
  )
}

export default App
