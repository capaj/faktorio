import React from 'react'
import ReactPDF, {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { reactMain } from './main'
import { InvoiceData } from './invoiceSchema'
import { formatMoneyCzech } from './lib/formatMoney'

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf',
      fontWeight: 100,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfMZhrib2Bg-4.ttf',
      fontWeight: 200,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfMZhrib2Bg-4.ttf',
      fontWeight: 300,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
      fontWeight: 400,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf',
      fontWeight: 500,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf',
      fontWeight: 600,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf',
      fontWeight: 700,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYMZhrib2Bg-4.ttf',
      fontWeight: 800,
    },
    {
      src: 'http://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYMZhrib2Bg-4.ttf',
      fontWeight: 900,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    // padding: 10,
    fontFamily: 'Inter',
    color: '#000',
  },
  section: {
    marginTop: 10,

    fontSize: 12,
    fontFamily: 'Inter',
  },
  flex: {
    display: 'flex',
    flexDirection: 'row',
  },
})

const Flex = ({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: ReactPDF.DocumentProps['style']
}) => {
  return (
    <View
      style={{
        display: 'flex',
        ...style,
      }}
    >
      {children}
    </View>
  )
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text
      style={{
        fontSize: 12,
        color: '#454545',
      }}
    >
      {children}
    </Text>
  )
}

const TextLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text
      style={{
        fontSize: 10,
        color: '#454545',
      }}
    >
      {children}
    </Text>
  )
}

const FlexRow = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 10,
      }}
    >
      {children}
    </Flex>
  )
}

const ThirdWidthColumnRight = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      style={{
        width: '33%',
        textAlign: 'right',
      }}
    >
      <Text>{children}</Text>
    </Flex>
  )
}
const ItemDescText = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ReactPDF.DocumentProps['style']
}) => {
  return (
    <Text
      style={{
        marginRight: 10,
        ...style,
      }}
    >
      {children}
    </Text>
  )
}

export const CzechInvoicePDF = ({
  invoiceData,
}: {
  invoiceData: InvoiceData
}) => {
  const taxPaidByRate: Record<number, number> = invoiceData.items.reduce(
    (acc, item) => {
      const total = item.quantity * item.unitPrice
      const tax = total * item.vatRate
      return {
        ...acc,
        // @ts-expect-error
        [item.vatRate]: ((acc[item.vatRate] ?? 0) as number) + tax,
      }
    },
    {}
  )

  const taxTotal = Object.values(taxPaidByRate).reduce(
    (acc: number, item: number) => acc + item,
    0
  )
  const invoiceTotal = invoiceData.items.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  )
  console.log('taxPaidByRate:', taxPaidByRate)

  return (
    <Document key={new Date().toISOString()}>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Flex
            style={{
              minHeight: 200,
              width: '100%',
            }}
          >
            <Flex
              style={{
                flexDirection: 'row',
                marginTop: 50,
                fontSize: 22,
              }}
            >
              <View
                style={{
                  width: '50%',
                }}
              ></View>
              <Flex
                style={{
                  flexDirection: 'column',
                  marginLeft: 20,
                }}
              >
                <Text>Faktura</Text>
                <Text>
                  <Text>{invoiceData.invoiceNumber}</Text>
                </Text>
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                  }}
                >
                  Daňový doklad
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </View>
        <Flex
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginLeft: 2,
          }}
        >
          <Flex
            style={{
              flexDirection: 'row',
              marginLeft: 20,
            }}
          >
            <Flex
              style={{
                width: '57%',
                flexDirection: 'column',
                fontSize: 11,
              }}
            >
              <SectionHeading>Dodavatel</SectionHeading>

              <View style={styles.section}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {invoiceData.supplier.name}
                </Text>
                <Text>{invoiceData.supplier.address.street}</Text>
                <Text>
                  {invoiceData.supplier.address.postalCode}{' '}
                  {invoiceData.supplier.address.city}
                </Text>
                {/* Other supplier details */}
              </View>
              <Flex
                style={{
                  marginTop: 10,
                  paddingRight: 40,
                }}
              >
                <FlexRow>
                  <TextLabel>IČ </TextLabel>
                  <Text>{invoiceData.supplier.companyId}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>DIČ </TextLabel>
                  <Text>{invoiceData.supplier.vatNumber}</Text>
                </FlexRow>
              </Flex>
              <View
                style={{
                  ...styles.section,
                  paddingRight: 40,
                }}
              >
                <FlexRow>
                  <TextLabel>Bankovní účet</TextLabel>
                  <Text>{invoiceData.paymentDetails.account ?? '-'}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>IBAN</TextLabel>
                  <Text>{invoiceData.paymentDetails.IBAN}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>SWIFT/BIC</TextLabel>
                  <Text>{invoiceData.paymentDetails.swiftCode}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>Variabilní symbol</TextLabel>
                  <Text>{invoiceData.invoiceNumber.replace('-', '')}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>Způsob platby</TextLabel>

                  <Text>Převodem</Text>
                </FlexRow>
              </View>
            </Flex>

            <Flex
              style={{
                marginRight: 22,
                width: '43%',
              }}
            >
              <SectionHeading>Odběratel</SectionHeading>

              <View style={styles.section}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {invoiceData.customer.name}
                </Text>
                <Text>{invoiceData.customer.address.street}</Text>
                <Text>
                  {invoiceData.customer.address.postalCode}{' '}
                  {invoiceData.customer.address.city}
                </Text>
                <Flex
                  style={{
                    marginTop: 10,
                  }}
                >
                  <FlexRow>
                    <TextLabel>IČ </TextLabel>
                    <Text>{invoiceData.customer.companyId}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>DIČ </TextLabel>
                    <Text>{invoiceData.customer.vatNumber}</Text>
                  </FlexRow>
                </Flex>
                <Flex
                  style={{
                    marginTop: 10,
                  }}
                >
                  <FlexRow>
                    <TextLabel>Datum vystavení </TextLabel>
                    <Text>{invoiceData.issueDate}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Datum splatnosti </TextLabel>
                    <Text>{invoiceData.dueDate}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Datum zdan. plnění </TextLabel>
                    <Text>{invoiceData.taxableDate}</Text>
                  </FlexRow>
                </Flex>
              </View>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          style={{
            flexDirection: 'row',
            fontSize: 10,
            marginTop: 20,
            marginRight: 22,
            justifyContent: 'flex-end',
          }}
        >
          <Flex
            style={{
              width: '49%',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <ThirdWidthColumnRight>DPH</ThirdWidthColumnRight>
            <ThirdWidthColumnRight>Cena za MJ</ThirdWidthColumnRight>
            <ThirdWidthColumnRight>Celkem bez DPH</ThirdWidthColumnRight>
          </Flex>
        </Flex>
        <View
          style={{
            marginTop: 10,
            marginRight: 22,
            paddingTop: 7,
            paddingBottom: 0,
            marginLeft: 20,
            fontSize: 10,
            borderBottom: '1px solid #444',
            borderTop: '1px solid #444',
          }}
        >
          {invoiceData.items.map((item, index) => (
            <Flex
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 7,
              }}
            >
              <Flex
                style={{
                  width: '50%',
                  flexDirection: 'row',

                  justifyContent: 'flex-start',
                }}
              >
                <ItemDescText
                  style={{
                    width: '4%',
                  }}
                >
                  {item.quantity}
                </ItemDescText>
                <ItemDescText
                  style={{
                    width: '14%',
                    fontSize: 9,
                  }}
                >
                  {item.unit}
                </ItemDescText>
                <ItemDescText>{item.description}</ItemDescText>
              </Flex>
              <Flex
                style={{
                  width: '50%',
                  flexDirection: 'row',
                }}
              >
                <ThirdWidthColumnRight>
                  {item.vatRate * 100} %
                </ThirdWidthColumnRight>
                <ThirdWidthColumnRight>
                  {formatMoneyCzech(item.unitPrice, invoiceData.currency)}
                </ThirdWidthColumnRight>
                <ThirdWidthColumnRight>
                  {formatMoneyCzech(
                    item.unitPrice * item.quantity,
                    invoiceData.currency
                  )}
                </ThirdWidthColumnRight>
              </Flex>
            </Flex>
          ))}
        </View>
        <Flex
          style={{
            marginTop: 30,
            marginRight: 22,
            flexDirection: 'row',
          }}
        >
          <Flex
            style={{
              width: '60%',
            }}
          ></Flex>
          <Flex
            style={{
              flexDirection: 'column',
              width: '40%',
            }}
          >
            <Flex
              style={{
                borderBottom: '1px solid #444',
              }}
            >
              <FlexRow>
                <TextLabel>Celkem bez DPH</TextLabel>
                <Text>
                  {formatMoneyCzech(invoiceTotal, invoiceData.currency)}
                </Text>
              </FlexRow>
              {Object.entries(taxPaidByRate).map(([rate, tax]) => {
                return (
                  <FlexRow key={rate}>
                    <TextLabel>DPH {Number(rate) * 100}%</TextLabel>
                    <Text>{formatMoneyCzech(tax, invoiceData.currency)}</Text>
                  </FlexRow>
                )
              })}
            </Flex>

            <Text
              style={{
                fontSize: 24,
                marginTop: 6,
                textAlign: 'right',
                fontWeight: 500,
              }}
            >
              {formatMoneyCzech(invoiceTotal + taxTotal, invoiceData.currency)}
            </Text>
          </Flex>
        </Flex>

        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            fontSize: 8,
          }}
        >
          <Text>Fyzická osoba zapsaná v živnostenském rejstříku.</Text>
          <Text>Faktura vystavena na faktorio.cz</Text>
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
