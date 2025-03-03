import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Link,
  DocumentProps
} from '@react-pdf/renderer'

import { formatMoneyEnglish } from '../../lib/formatMoney'
import {
  InsertInvoiceItemType,
  SelectInvoiceType
} from '../../../../faktorio-api/src/zodDbSchemas'
import { useQRCodeBase64 } from '@/lib/useQRCodeBase64'
import { generateQrPaymentString } from '@/lib/qrCodeGenerator'
import { reactMainRender } from '@/main'

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf',
      fontWeight: 100
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfMZhrib2Bg-4.ttf',
      fontWeight: 200
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfMZhrib2Bg-4.ttf',
      fontWeight: 300
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
      fontWeight: 400
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf',
      fontWeight: 500
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf',
      fontWeight: 600
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf',
      fontWeight: 700
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYMZhrib2Bg-4.ttf',
      fontWeight: 800
    },
    {
      src: '//fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYMZhrib2Bg-4.ttf',
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
    marginTop: 10,

    fontSize: 12,
    fontFamily: 'Inter'
  },
  flex: {
    display: 'flex',
    flexDirection: 'row'
  }
})

const Flex = ({
  children,
  style
}: {
  children?: React.ReactNode
  style?: DocumentProps['style']
}) => {
  return (
    <View
      style={{
        display: 'flex',
        ...style
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
        color: '#454545'
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
        color: '#454545'
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
        fontSize: 10
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
        textAlign: 'right'
      }}
    >
      <Text>{children}</Text>
    </Flex>
  )
}
const ItemDescText = ({
  children,
  style
}: {
  children: React.ReactNode
  style?: DocumentProps['style']
}) => {
  return (
    <Text
      style={{
        marginRight: 10,
        ...style
      }}
    >
      {children}
    </Text>
  )
}

export const EnglishInvoicePDF = ({
  invoiceData
}: {
  invoiceData: SelectInvoiceType & { items: InsertInvoiceItemType[] }
}) => {
  const taxPaidByRate: Record<number, number> = invoiceData.items.reduce(
    (acc, item) => {
      const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
      const vat = item.vat_rate ?? 0
      const tax = total * (vat / 100)
      return {
        ...acc,
        // @ts-expect-error
        [vat]: ((acc[vat] ?? 0) as number) + tax
      }
    },
    {}
  )

  const taxTotal = Object.values(taxPaidByRate).reduce(
    (acc: number, item: number) => acc + item,
    0
  )
  const invoiceTotal = invoiceData.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )
  console.log('taxPaidByRate:', {
    accountNumber: invoiceData.iban,
    amount: invoiceTotal + taxTotal,
    currency: invoiceData.currency,
    variableSymbol: invoiceData.number.replace('-', '')
  })
  const qrCodeBase64 = useQRCodeBase64(
    generateQrPaymentString({
      accountNumber: invoiceData.iban?.replace(/\s/g, '') ?? '',
      amount: invoiceTotal + taxTotal,
      currency: invoiceData.currency,
      variableSymbol: invoiceData.number.replace('-', ''),
      message: 'Faktura ' + invoiceData.number
    })
  )
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
          <Flex
            style={{
              minHeight: 200,
              width: '100%'
            }}
          >
            <Flex
              style={{
                flexDirection: 'row',
                marginTop: 50,
                fontSize: 22
              }}
            >
              <View
                style={{
                  width: '50%'
                }}
              >
                <View
                  style={{
                    margin: 20
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13
                    }}
                  >
                    QR Payment:
                  </Text>
                  <Image
                    style={{
                      width: 100,
                      height: 100
                    }}
                    source={qrCodeBase64}
                  ></Image>
                </View>
              </View>
              <Flex
                style={{
                  flexDirection: 'column',
                  marginLeft: 20
                }}
              >
                <Text>Invoice</Text>
                <Text>
                  <Text>{invoiceData.number}</Text>
                </Text>
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 11
                  }}
                >
                  Tax Document
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </View>
        <Flex
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginLeft: 2
          }}
        >
          <Flex
            style={{
              flexDirection: 'row',
              marginLeft: 20
            }}
          >
            <Flex
              style={{
                width: '57%',
                flexDirection: 'column',
                fontSize: 11
              }}
            >
              <SectionHeading>Supplier</SectionHeading>
              <View style={styles.section}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {invoiceData.your_name}
                </Text>
                <Text>{invoiceData.your_street}</Text>
                <Text>
                  {invoiceData.your_zip} {invoiceData.your_city}
                </Text>
              </View>

              <Flex
                style={{
                  marginTop: 10,
                  paddingRight: 40
                }}
              >
                <FlexRow>
                  <TextLabel>Reg. No. </TextLabel>
                  <Text>{invoiceData.your_registration_no}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>VAT No. </TextLabel>
                  <Text>{invoiceData.your_vat_no}</Text>
                </FlexRow>
              </Flex>
              <View
                style={{
                  ...styles.section,
                  paddingRight: 40
                }}
              >
                <FlexRow>
                  <TextLabel>Bank Account</TextLabel>
                  <Text>{invoiceData.bank_account ?? '-'}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>IBAN</TextLabel>
                  <Text>{invoiceData.iban}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>SWIFT/BIC</TextLabel>
                  <Text>{invoiceData.swift_bic}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>Variable Symbol</TextLabel>
                  <Text>{invoiceData.number.replace('-', '')}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>Payment Method</TextLabel>
                  <Text>Wire transfer</Text>
                </FlexRow>
              </View>
            </Flex>

            <Flex
              style={{
                marginRight: 22,
                width: '43%'
              }}
            >
              <SectionHeading>Recipient</SectionHeading>

              <View style={styles.section}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {invoiceData.client_name}
                </Text>
                <Text>{invoiceData.client_street}</Text>
                <Text>
                  {invoiceData.client_zip} {invoiceData.client_city}
                </Text>
                <Flex
                  style={{
                    marginTop: 10
                  }}
                >
                  <FlexRow>
                    <TextLabel>Reg. No. </TextLabel>
                    <Text>{invoiceData.client_registration_no}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>VAT No. </TextLabel>
                    <Text>{invoiceData.client_vat_no}</Text>
                  </FlexRow>
                </Flex>
                <Flex
                  style={{
                    marginTop: 10
                  }}
                >
                  <FlexRow>
                    <TextLabel>Issue Date </TextLabel>
                    <Text>{invoiceData.issued_on}</Text>{' '}
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Due Date </TextLabel>
                    <Text>{invoiceData.due_on}</Text>{' '}
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Taxable fulfillment date </TextLabel>
                    <Text>{invoiceData.taxable_fulfillment_due} </Text>
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
            justifyContent: 'flex-end'
          }}
        >
          <Flex
            style={{
              width: '49%',
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}
          >
            <ThirdWidthColumnRight>VAT</ThirdWidthColumnRight>
            <ThirdWidthColumnRight>Unit Price</ThirdWidthColumnRight>
            <ThirdWidthColumnRight>Total Excl. VAT</ThirdWidthColumnRight>
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
            borderTop: '1px solid #444'
          }}
        >
          {invoiceData.items.map((item, index) => {
            const unitPrice = item.unit_price ?? 0
            const quantity = item.quantity ?? 0
            const vatRate = item.vat_rate ?? 0
            return (
              <Flex
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 7
                }}
              >
                <Flex
                  style={{
                    width: '50%',
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'flex-start'
                  }}
                >
                  <ItemDescText
                    style={{
                      width: '5%'
                    }}
                  >
                    {item.quantity}
                  </ItemDescText>
                  <ItemDescText
                    style={{
                      width: '14%',
                      fontSize: 9
                    }}
                  >
                    {item.unit}
                  </ItemDescText>
                  <ItemDescText>{item.description}</ItemDescText>
                </Flex>
                <Flex
                  style={{
                    width: '50%',
                    flexDirection: 'row'
                  }}
                >
                  <ThirdWidthColumnRight>{vatRate} %</ThirdWidthColumnRight>
                  <ThirdWidthColumnRight>
                    {formatMoneyEnglish(unitPrice, invoiceData.currency)}
                  </ThirdWidthColumnRight>
                  <ThirdWidthColumnRight>
                    {formatMoneyEnglish(
                      unitPrice * quantity,
                      invoiceData.currency
                    )}
                  </ThirdWidthColumnRight>
                </Flex>
              </Flex>
            )
          })}
        </View>

        <Flex
          style={{
            marginTop: 30,
            marginRight: 22,
            flexDirection: 'row'
          }}
        >
          <Flex
            style={{
              width: '60%'
            }}
          ></Flex>
          <Flex
            style={{
              flexDirection: 'column',
              width: '40%'
            }}
          >
            <Flex
              style={{
                borderBottom: '1px solid #444'
              }}
            >
              <FlexRow>
                <TextLabel>Total without VAT</TextLabel>
                <Text>
                  {formatMoneyEnglish(invoiceTotal, invoiceData.currency)}
                </Text>
              </FlexRow>
              {Object.entries(taxPaidByRate).map(([rate, tax]) => {
                return (
                  <FlexRow key={rate}>
                    <TextLabel>VAT {Number(rate)}%</TextLabel>
                    <Text>{formatMoneyEnglish(tax, invoiceData.currency)}</Text>
                  </FlexRow>
                )
              })}
            </Flex>

            <Text
              style={{
                fontSize: 24,
                marginTop: 6,
                textAlign: 'right',
                fontWeight: 500
              }}
            >
              {formatMoneyEnglish(
                invoiceTotal + taxTotal,
                invoiceData.currency
              )}
            </Text>
          </Flex>
        </Flex>
        <Text style={{ marginLeft: 22, marginTop: 10, fontSize: 10 }}>
          {invoiceData.footer_note}
        </Text>
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            fontSize: 8
          }}
        >
          {/* This text is required by law to be on each invoice */}
          <Text>Fyzická osoba zapsaná v živnostenském rejstříku.</Text>
          <Text>
            Invoice issued on <Link href="faktorio.cz">faktorio.cz</Link>
          </Text>
        </View>
      </Page>
    </Document>
  )
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    reactMainRender() // force rerender of whole app
  })
}
