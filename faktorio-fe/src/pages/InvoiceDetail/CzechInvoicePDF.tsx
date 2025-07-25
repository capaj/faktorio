import React, { Fragment } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  Link,
} from '@react-pdf/renderer'
import { formatMoneyCzech } from '../../lib/formatMoney'
import {
  InsertInvoiceItemType,
  SelectInvoiceType
} from 'faktorio-api/src/zodDbSchemas'
import { Flex, FlexRow, ItemDescText, pdfStyles, SectionHeading, TextLabel, ThirdWidthColumnRight } from './pdfStyles'

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

// takes a date string in the format YYYY-MM-DD and returns it in the format DD.MM.YYYY
function reformatDateToCzech(dateString: string) {
  // Split the input date string into year, month, and day parts
  const [year, month, day] = dateString.split('-')

  // Check for validity of the input date
  if (!year || !month || !day || isNaN(new Date(dateString).getTime())) {
    return 'Invalid date'
  }

  // Return the date in Czech format (DD.MM.YYYY)
  return `${parseInt(day, 10)}.${parseInt(month, 10)}.${year}`
}


export const CzechInvoicePDF = ({
  invoiceData,
  qrCodeBase64
}: {
  invoiceData: SelectInvoiceType & { items: InsertInvoiceItemType[] }
  qrCodeBase64: string
}) => {
  const taxPaidByRate: Record<number, number> = invoiceData.items.reduce(
    (acc, item) => {
      const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
      const vat = item.vat_rate ?? 0
      const tax = total * (vat / 100)
      return {
        ...acc,
        [vat]: ((acc[vat] ?? 0) as number) + tax
      }
    },
    {} as Record<number, number>
  )

  const taxTotal = Object.values(taxPaidByRate).reduce(
    (acc: number, item: number) => acc + item,
    0
  )
  const invoiceTotal = invoiceData.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  return (
    <Document key={new Date().toISOString()}>
      <Page size="A4" style={pdfStyles.page}>
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
                      fontSize: 13,
                      marginLeft: 10,
                      marginTop: -20
                    }}
                  >
                    QR platba:
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
                <Text>Faktura</Text>
                <Text>
                  <Text>{invoiceData.number}</Text>
                </Text>
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 11
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
              <SectionHeading>Dodavatel</SectionHeading>

              <View style={pdfStyles.section}>
                <View style={{ maxWidth: '95%' }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {invoiceData.your_name}
                  </Text>
                </View>
                <Text>{invoiceData.your_street}</Text>
                <Text>
                  {invoiceData.your_zip} {invoiceData.your_city}
                </Text>
                {/* Other supplier details */}
              </View>
              <Flex
                style={{
                  marginTop: 10,
                  paddingRight: 40
                }}
              >
                <FlexRow>
                  <TextLabel>IČ </TextLabel>
                  <Text>{invoiceData.your_registration_no}</Text>
                </FlexRow>
                <FlexRow>
                  <TextLabel>DIČ </TextLabel>
                  <Text>{invoiceData.your_vat_no}</Text>
                </FlexRow>
              </Flex>
              <View
                style={{
                  ...pdfStyles.section,
                  paddingRight: 40
                }}
              >
                <FlexRow>
                  <TextLabel>Bankovní účet</TextLabel>
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
                  <TextLabel>Variabilní symbol</TextLabel>
                  <Text>{invoiceData.number.replace('-', '')}</Text>
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
                width: '43%'
              }}
            >
              <SectionHeading>Odběratel</SectionHeading>

              <View style={pdfStyles.section}>
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
                    <TextLabel>IČ </TextLabel>
                    <Text>{invoiceData.client_registration_no}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>DIČ </TextLabel>
                    <Text>{invoiceData.client_vat_no}</Text>
                  </FlexRow>
                </Flex>
                <Flex
                  style={{
                    marginTop: 10
                  }}
                >
                  <FlexRow>
                    <TextLabel>Datum vystavení </TextLabel>
                    <Text>
                      {reformatDateToCzech(invoiceData.issued_on ?? '')}
                    </Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Datum splatnosti </TextLabel>
                    <Text>{reformatDateToCzech(invoiceData.due_on)}</Text>
                  </FlexRow>
                  <FlexRow>
                    <TextLabel>Datum zdan. plnění </TextLabel>
                    <Text>
                      {reformatDateToCzech(
                        invoiceData.taxable_fulfillment_due ?? ''
                      )}
                    </Text>
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
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'flex-start'
                  }}
                >
                  <ThirdWidthColumnRight>{vatRate} %</ThirdWidthColumnRight>
                  <ThirdWidthColumnRight>
                    {formatMoneyCzech(unitPrice, invoiceData.currency)}
                  </ThirdWidthColumnRight>
                  <ThirdWidthColumnRight>
                    {formatMoneyCzech(
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
                <TextLabel>Celkem bez DPH</TextLabel>
                <Text>
                  {formatMoneyCzech(invoiceTotal, invoiceData.currency)}
                </Text>
              </FlexRow>
              {Object.entries(taxPaidByRate).map(([rate, tax]) => {
                return (
                  <Fragment key={rate}>
                    <FlexRow >
                      <TextLabel>DPH {Number(rate)}%</TextLabel>
                      <Text>{formatMoneyCzech(tax, invoiceData.currency)}</Text>
                    </FlexRow>

                  </Fragment>

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
              {formatMoneyCzech(invoiceTotal + taxTotal, invoiceData.currency)}
            </Text>
          </Flex>
        </Flex>
        {invoiceData.exchange_rate > 1 && <Flex
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
              <Text style={{ fontSize: 12, color: 'gray' }}>
                Přepočet na CZK kurz <Text style={{ fontWeight: 500, color: 'black' }}>
                  {invoiceData.exchange_rate} CZK / 1 {invoiceData.currency}
                </Text>
              </Text>
              <FlexRow>
                <TextLabel>Celkem bez DPH</TextLabel>
                <Text style={{ color: 'gray' }}>
                  {formatMoneyCzech(invoiceTotal * invoiceData.exchange_rate, 'CZK')}
                </Text>
              </FlexRow>
              {Object.entries(taxPaidByRate).map(([rate, tax]) => {
                return (
                  <Fragment key={rate}>

                    <FlexRow>
                      <TextLabel style={{ color: 'gray' }}>DPH {Number(rate)}% v CZK</TextLabel>
                      <Text style={{
                        color: 'gray'
                      }}>
                        {formatMoneyCzech(
                          tax * invoiceData.exchange_rate,
                          'CZK'
                        )}
                      </Text>
                    </FlexRow>
                  </Fragment>

                )
              })}

            </Flex>

            <Text
              style={{
                fontSize: 16,
                color: 'gray',
                marginTop: 6,
                textAlign: 'right',
                fontWeight: 500
              }}
            >
              {formatMoneyCzech((invoiceTotal + taxTotal) * invoiceData.exchange_rate, 'CZK')}
            </Text>
          </Flex>
        </Flex>}
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
          <Text>Fyzická osoba zapsaná v živnostenském rejstříku.</Text>
          <Text>
            Faktura vystavena na{' '}
            <Link href="https://faktorio.cz">faktorio.cz</Link>
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
