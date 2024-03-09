import { useState } from 'react'

import { Box, Center } from '@chakra-ui/react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { CzechInvoicePDF } from './CzechInvoicePDF'
import { invoiceData } from './invoiceSchema'

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
      </Center>
    </Box>
    // </ChakraProvider>
  )
}

export default App
