const moneyFormatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(
  amount: number | null | undefined,
  currency: string
) {
  if (amount == null) return '—'

  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    moneyFormatters.set(currency, formatter)
  }

  return formatter.format(amount)
}

export function formatMoneyCzech(number: number, currency: string) {
  if (currency === 'CZK') {
    return number.toLocaleString('cs', { style: 'currency', currency: 'CZK' })
  }

  return number.toLocaleString('en-US', {
    style: 'currency',
    currency: currency
  })
}

export function formatMoneyEnglish(number: number, currency: string) {
  return number.toLocaleString('en-US', { style: 'currency', currency })
}
