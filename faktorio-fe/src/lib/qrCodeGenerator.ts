export interface BankingInfo {
  accountNumber: string // The bank account number in IBAN format
  amount: number // The amount to be transferred
  currency: string // The currency code (e.g., CZK, EUR)
  message?: string // Optional payment message to the recipient
  variableSymbol?: string // Optional variable symbol for identifying the payment
}

export function generateQrPaymentString(bankingInfo: BankingInfo): string {
  const { accountNumber, amount, currency, message, variableSymbol } =
    bankingInfo

  // Start with the payment identifier and version
  let qrData = 'SPD*1.0'

  // Add the account number
  qrData += `*ACC:${accountNumber}`

  // Add the amount formatted to two decimal places
  qrData += `*AM:${amount.toFixed(2)}`

  // Add the currency
  qrData += `*CC:${currency}`

  // If a message is provided, add it to the string
  if (message) {
    qrData += `*MSG:${message}`
  }

  // If a variable symbol is provided, add it to the string
  if (variableSymbol) {
    qrData += `*X-VS:${variableSymbol}`
  }

  return qrData
}
