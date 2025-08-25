import {
  SelectInvoiceType,
  InsertInvoiceItemType
} from 'faktorio-api/src/zodDbSchemas'

/**
 * Generates ISDOC XML from invoice data
 * ISDOC is a Czech standard for electronic invoicing
 * @see https://isdoc.cz/6.0.2/doc-en/isdoc-invoice-6.0.2.html
 */
export function generateIsdocXml(
  invoice: SelectInvoiceType & { items: InsertInvoiceItemType[] },
  vatPayer: boolean = false
): string {
  // Calculate invoice totals
  const invoiceTotal = invoice.items.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  const taxTotal = invoice.items.reduce((acc, item) => {
    const total = (item.quantity ?? 0) * (item.unit_price ?? 0)
    const vat = vatPayer ? (item.vat_rate ?? 0) : 0
    return acc + total * (vat / 100)
  }, 0)

  // Format date to YYYY-MM-DD
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    return dateString
  }

  // Create XML with proper escaping for special characters
  const escapeXml = (unsafe: string | null | undefined): string => {
    if (!unsafe) return ''
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // Format UUID to standard format (8-4-4-4-12 characters) with valid hexadecimal characters
  const formatUuid = (id: string): string => {
    // Convert any non-hex character to a valid hex character (0-9, a-f)
    const hexOnly = id.replace(/[^0-9a-f]/gi, (digit) => {
      // Convert any non-hex character to its character code and take modulo 16
      // Then convert to hex digit (0-9, a-f)
      return (digit.charCodeAt(0) % 16).toString(16)
    })

    // Pad the ID with zeros if it's too short
    const paddedId = hexOnly.padEnd(32, '0')

    // Format as standard UUID with dashes
    return `${paddedId.substring(0, 8)}-${paddedId.substring(8, 12)}-${paddedId.substring(12, 16)}-${paddedId.substring(16, 20)}-${paddedId.substring(20, 32)}`
  }

  // Generate ISDOC XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} -->
<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.2">
  <DocumentType>1</DocumentType>
  <ID>${escapeXml(invoice.number)}</ID>
  <UUID>${formatUuid(invoice.id)}</UUID>
  <IssuingSystem>Faktorio</IssuingSystem>
  <IssueDate>${formatDate(invoice.issued_on)}</IssueDate>
  <TaxPointDate>${formatDate(invoice.taxable_fulfillment_due)}</TaxPointDate>
  <VATApplicable>${vatPayer}</VATApplicable>
  <ElectronicPossibilityAgreementReference></ElectronicPossibilityAgreementReference>
  <Note>${escapeXml(invoice.footer_note)}</Note>
  <LocalCurrencyCode>${escapeXml(invoice.currency)}</LocalCurrencyCode>
  <CurrRate>${invoice.exchange_rate ?? 1}</CurrRate>
  <RefCurrRate>1</RefCurrRate>
  
  <AccountingSupplierParty>
    <Party>
      <PartyIdentification>
        <ID>${escapeXml(invoice.your_registration_no)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escapeXml(invoice.your_name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escapeXml(invoice.your_street)}</StreetName>
        <BuildingNumber>1</BuildingNumber>
        <CityName>${escapeXml(invoice.your_city)}</CityName>
        <PostalZone>${escapeXml(invoice.your_zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>
      ${
        invoice.your_vat_no
          ? `
      <PartyTaxScheme>
        <CompanyID>${escapeXml(invoice.your_vat_no)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>
      `
          : ''
      }
    </Party>
  </AccountingSupplierParty>
  
  <SellerSupplierParty>
    <Party>
      <PartyIdentification>
        <ID>${escapeXml(invoice.your_registration_no)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escapeXml(invoice.your_name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escapeXml(invoice.your_street)}</StreetName>
        <BuildingNumber>1</BuildingNumber>
        <CityName>${escapeXml(invoice.your_city)}</CityName>
        <PostalZone>${escapeXml(invoice.your_zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>
      ${
        invoice.your_vat_no
          ? `
      <PartyTaxScheme>
        <CompanyID>${escapeXml(invoice.your_vat_no)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>
      `
          : ''
      }
    </Party>
  </SellerSupplierParty>
  
  <AccountingCustomerParty>
    <Party>
      <PartyIdentification>
        <ID>${escapeXml(invoice.client_registration_no)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escapeXml(invoice.client_name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escapeXml(invoice.client_street)}</StreetName>
        <BuildingNumber>1</BuildingNumber>
        <CityName>${escapeXml(invoice.client_city)}</CityName>
        <PostalZone>${escapeXml(invoice.client_zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>
      ${
        invoice.client_vat_no
          ? `
      <PartyTaxScheme>
        <CompanyID>${escapeXml(invoice.client_vat_no)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>
      `
          : ''
      }
    </Party>
  </AccountingCustomerParty>
  
  <BuyerCustomerParty>
    <Party>
      <PartyIdentification>
        <ID>${escapeXml(invoice.client_registration_no)}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${escapeXml(invoice.client_name)}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${escapeXml(invoice.client_street)}</StreetName>
        <BuildingNumber>1</BuildingNumber>
        <CityName>${escapeXml(invoice.client_city)}</CityName>
        <PostalZone>${escapeXml(invoice.client_zip)}</PostalZone>
        <Country>
          <IdentificationCode>CZ</IdentificationCode>
          <Name>Česká republika</Name>
        </Country>
      </PostalAddress>
      ${
        invoice.client_vat_no
          ? `
      <PartyTaxScheme>
        <CompanyID>${escapeXml(invoice.client_vat_no)}</CompanyID>
        <TaxScheme>VAT</TaxScheme>
      </PartyTaxScheme>
      `
          : ''
      }
    </Party>
  </BuyerCustomerParty>
  
  <InvoiceLines>
    ${invoice.items
      .map((item, index) => {
        const unitPrice = item.unit_price ?? 0
        const quantity = item.quantity ?? 0
        const vatRate = vatPayer ? (item.vat_rate ?? 0) : 0
        const lineTotal = unitPrice * quantity
        const lineTax = lineTotal * (vatRate / 100)
        const lineTotalWithTax = lineTotal + lineTax

        return `
    <InvoiceLine>
      <ID>${index + 1}</ID>
      <InvoicedQuantity unitCode="">${quantity.toFixed(1)}</InvoicedQuantity>
      <LineExtensionAmount>${lineTotal.toFixed(1)}</LineExtensionAmount>
      <LineExtensionAmountTaxInclusive>${lineTotalWithTax.toFixed(2)}</LineExtensionAmountTaxInclusive>
      <LineExtensionTaxAmount>${lineTax.toFixed(2)}</LineExtensionTaxAmount>
      <UnitPrice>${unitPrice.toFixed(1)}</UnitPrice>
      <UnitPriceTaxInclusive>${(unitPrice * (1 + vatRate / 100)).toFixed(2)}</UnitPriceTaxInclusive>
      <ClassifiedTaxCategory>
        <Percent>${vatRate}</Percent>
        <VATCalculationMethod>0</VATCalculationMethod>
        <VATApplicable>${vatPayer}</VATApplicable>
      </ClassifiedTaxCategory>
      <Note></Note>
      <Item>
        <Description>${escapeXml(item.description)}</Description>
      </Item>
    </InvoiceLine>`
      })
      .join('')}
  </InvoiceLines>
  
  <TaxTotal>
    <TaxSubTotal>
      <TaxableAmount>${invoiceTotal.toFixed(1)}</TaxableAmount>
      <TaxAmount>${taxTotal.toFixed(2)}</TaxAmount>
      <TaxInclusiveAmount>${(invoiceTotal + taxTotal).toFixed(2)}</TaxInclusiveAmount>
      <AlreadyClaimedTaxableAmount>0</AlreadyClaimedTaxableAmount>
      <AlreadyClaimedTaxAmount>0</AlreadyClaimedTaxAmount>
      <AlreadyClaimedTaxInclusiveAmount>0</AlreadyClaimedTaxInclusiveAmount>
      <DifferenceTaxableAmount>${invoiceTotal.toFixed(1)}</DifferenceTaxableAmount>
      <DifferenceTaxAmount>${taxTotal.toFixed(2)}</DifferenceTaxAmount>
      <DifferenceTaxInclusiveAmount>${(invoiceTotal + taxTotal).toFixed(2)}</DifferenceTaxInclusiveAmount>
      <TaxCategory>
        <Percent>${vatPayer ? 21 : 0}</Percent>
      </TaxCategory>
    </TaxSubTotal>
    <TaxAmount>${taxTotal.toFixed(2)}</TaxAmount>
  </TaxTotal>
  
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>${invoiceTotal.toFixed(1)}</TaxExclusiveAmount>
    <TaxInclusiveAmount>${(invoiceTotal + taxTotal).toFixed(2)}</TaxInclusiveAmount>
    <AlreadyClaimedTaxExclusiveAmount>0</AlreadyClaimedTaxExclusiveAmount>
    <AlreadyClaimedTaxInclusiveAmount>0</AlreadyClaimedTaxInclusiveAmount>
    <DifferenceTaxExclusiveAmount>${invoiceTotal.toFixed(1)}</DifferenceTaxExclusiveAmount>
    <DifferenceTaxInclusiveAmount>${(invoiceTotal + taxTotal).toFixed(2)}</DifferenceTaxInclusiveAmount>
    <PayableRoundingAmount>0</PayableRoundingAmount>
    <PaidDepositsAmount>0</PaidDepositsAmount>
    <PayableAmount>${(invoiceTotal + taxTotal).toFixed(2)}</PayableAmount>
  </LegalMonetaryTotal>
  
  <PaymentMeans>
    <Payment>
      <PaidAmount>${(invoiceTotal + taxTotal).toFixed(2)}</PaidAmount>
      <PaymentMeansCode>${invoice.payment_method === 'bank' ? '42' : '10'}</PaymentMeansCode>
      <Details>
        <PaymentDueDate>${formatDate(invoice.due_on)}</PaymentDueDate>
        ${
          invoice.bank_account && invoice.bank_account.includes('/')
            ? `<ID>${escapeXml(invoice.bank_account.split('/')[0])}</ID>`
            : invoice.bank_account
              ? `<ID>${escapeXml(invoice.bank_account)}</ID>`
              : ''
        }
        ${
          invoice.bank_account && invoice.bank_account.includes('/')
            ? `<BankCode>${escapeXml(invoice.bank_account.split('/')[1])}</BankCode>`
            : '<BankCode>0100</BankCode>'
        }
        <Name>Banka</Name>
        ${invoice.iban ? `<IBAN>${escapeXml(invoice.iban)}</IBAN>` : ''}
        ${invoice.swift_bic ? `<BIC>${escapeXml(invoice.swift_bic)}</BIC>` : ''}
        <VariableSymbol>${escapeXml(invoice.number?.replace('-', ''))}</VariableSymbol>
      </Details>
    </Payment>
  </PaymentMeans>
</Invoice>`

  return xml
}
