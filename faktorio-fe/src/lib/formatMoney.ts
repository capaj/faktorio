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
