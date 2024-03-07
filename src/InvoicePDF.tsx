import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from '@react-pdf/renderer'
import { reactMain } from './main'

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf',
      fontWeight: 100
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfMZhrib2Bg-4.ttf',
      fontWeight: 200
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfMZhrib2Bg-4.ttf',
      fontWeight: 300
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
      fontWeight: 400
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf',
      fontWeight: 500
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf',
      fontWeight: 600
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf',
      fontWeight: 700
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYMZhrib2Bg-4.ttf',
      fontWeight: 800
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYMZhrib2Bg-4.ttf',
      fontWeight: 900
    }
  ]
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    // padding: 10,
    fontFamily: 'Inter',
    color: '#000'
  },
  section: {
    // margin: 10,
    // padding: 20,
    textOverflow: 'ellipsis',

    fontSize: 12,
    fontFamily: 'Inter'
    // flexGrow: 1,
    // minHeight: '400px'
  },
  flex: {
    display: 'flex',
    flexDirection: 'row'
  }
})

export const InvoicePDF = ({ invoiceData }) => {
  console.log('aaaa')
  return (
    <Document key={new Date().toISOString()}>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <View
            style={{
              minHeight: 300,
              width: 500,
              display: 'flex',
              alignContent: 'flex-end'
            }}
          >
            <View
              style={{
                marginTop: 50,
                fontSize: 24,
                textAlign: 'right'
              }}
            >
              <Text>Faktura</Text>
              <Text>
                <Text>{invoiceData.invoiceNumber}</Text>
              </Text>
              <Text
                style={{
                  fontSize: 14
                }}
              >
                Daňový doklad
              </Text>
            </View>
          </View>
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginLeft: 20
          }}
        >
          <View style={styles.section}>
            <Text>Dodavatel: {invoiceData.supplier.name}</Text>
            <Text>Adresa: {invoiceData.supplier.address}</Text>
            {/* Other supplier details */}
          </View>
          <View style={styles.section}>
            <Text>Faktura číslo: {invoiceData.invoiceNumber}</Text>
            <Text>Datum vystavení: {invoiceData.issueDate}</Text>
            <Text>Datum splatnosti: {invoiceData.dueDate}</Text>
            {/* Other invoice details */}
          </View>
          <View style={styles.section}>
            <Text>Odběratel: {invoiceData.customer.name}</Text>
            <Text>Adresa: {invoiceData.customer.address}</Text>
            {/* Other customer details */}
          </View>
        </View>
        <View style={styles.flex}>
          <View style={styles.section}>
            <Text>Popis služby: {invoiceData.serviceDescription}</Text>
            <Text>Cena za MJ: {invoiceData.pricePerUnit}</Text>
            <Text>Celkem bez DPH: {invoiceData.totalExclTax}</Text>
            {/* Other service details */}
          </View>
          <View style={styles.section}>
            {/* Payment details */}
            <Text>Bankovní účet: {invoiceData.paymentDetails.account}</Text>
            <Text>IBAN: {invoiceData.paymentDetails.IBAN}</Text>
            {/* Other payment details */}
          </View>
        </View>
      </Page>
    </Document>
  )
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('hot reload2', new Date())
    reactMain()
  })
}
