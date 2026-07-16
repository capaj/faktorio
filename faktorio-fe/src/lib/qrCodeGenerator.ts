export interface BankingInfo {
  accountNumber: string | null // The bank account number in IBAN or Czech domestic format
  amount: number // The amount to be transferred
  currency: string // The currency code (e.g., CZK, EUR)
  message?: string // Optional payment message to the recipient
  variableSymbol?: string // Optional variable symbol for identifying the payment
}

const CZECH_DOMESTIC_ACCOUNT_REGEX = /^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/

const calculateIbanCheckDigits = (bban: string): string => {
  // ISO 13616 check digit calculation for Czech IBANs. CZ is represented as 1235.
  const rearranged = `${bban}123500`
  let remainder = 0

  for (const character of rearranged) {
    remainder = (remainder * 10 + Number(character)) % 97
  }

  return String(98 - remainder).padStart(2, '0')
}

export const normalizeAccountNumberForQrPayment = (
  accountNumber: string | null
): string | null => {
  const normalizedAccountNumber = accountNumber?.replace(/\s/g, '') ?? null

  if (!normalizedAccountNumber) {
    return null
  }

  const czechDomesticAccountMatch = normalizedAccountNumber.match(
    CZECH_DOMESTIC_ACCOUNT_REGEX
  )

  if (!czechDomesticAccountMatch) {
    return normalizedAccountNumber
  }

  const [, prefix = '', account, bankCode] = czechDomesticAccountMatch
  const bban = `${bankCode}${prefix.padStart(6, '0')}${account.padStart(
    10,
    '0'
  )}`

  return `CZ${calculateIbanCheckDigits(bban)}${bban}`
}

/** Generate a QR payment string from banking information. Should work for most czech banking mobile apps */
export function generateQrPaymentString(
  bankingInfo: BankingInfo
): string | null {
  const { accountNumber, amount, currency, message, variableSymbol } =
    bankingInfo
  const normalizedAccountNumber =
    normalizeAccountNumberForQrPayment(accountNumber)

  if (!normalizedAccountNumber) {
    return null
  }
  // Start with the payment identifier and version
  let qrData = 'SPD*1.0'

  // Add the account number
  qrData += `*ACC:${normalizedAccountNumber}`

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
