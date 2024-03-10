// TODO adapt it to fakturoid export shape
export const invoiceData = {
  supplier: {
    name: 'Sample Supplier Inc.',
    address: {
      street: '123 Supplier Street',
      city: 'Supplier City',
      country: 'Supplier Country',
      postalCode: '12345'
    },
    phone: '123-456-7890',
    email: 'info@suppliersample.com',
    vatNumber: 'DE123456789',
    companyId: '123456789'
  },
  invoiceNumber: '2024-0001',
  issueDate: '2024-01-01',
  dueDate: '2024-02-01',
  taxableDate: '2023-12-31',
  customer: {
    name: 'Sample Customer LLC',
    address: {
      street: '123 Customer Street',
      city: 'Customer City',
      country: 'Customer Country',
      postalCode: '54321'
    },
    phone: '987-654-3210',
    email: 'contact@customerexample.com',
    vatNumber: 'CU123456789',
    companyId: '902111'
  },
  items: [
    {
      description: 'Web Development Services',
      quantity: 10,
      unitPrice: 100,
      unit: 'hours',
      vatRate: 0.21
    },
    {
      description: 'Web Design',
      quantity: 5,
      unitPrice: 80,
      unit: 'mandays',
      vatRate: 0.1
    }
  ],
  subtotal: 1400,
  taxAmount: 250,
  total: 1650,
  currency: 'CZK',
  paymentDetails: {
    account: '9876543210',
    IBAN: 'DE89 3704 0044 0532 0130 00',
    bankName: 'Sample Bank',
    swiftCode: 'BKODDEBB'
  }
}

export type InvoiceData = typeof invoiceData
