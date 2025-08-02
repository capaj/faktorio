export interface BankingInfo {
  accountNumber: string | null // The bank account number in IBAN format
  amount: number // The amount to be transferred
  currency: string // The currency code (e.g., CZK, EUR)
  message?: string // Optional payment message to the recipient
  variableSymbol?: string // Optional variable symbol for identifying the payment
}

/** Generate a QR payment string from banking information. Should work for most czech banking mobile apps */
export function generateQrPaymentString(
  bankingInfo: BankingInfo
): string | null {
  const { accountNumber, amount, currency, message, variableSymbol } =
    bankingInfo

  if (!accountNumber) {
    return null
  }
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
