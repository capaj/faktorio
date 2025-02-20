export async function getCNBExchangeRate(
  currency: string,
  date?: Date | null
): Promise<number | null> {
  if (currency === 'CZK') {
    return 1
  }

  let url =
    'https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt'
  if (date) {
    const now = new Date()
    // if date is in the future, we ignore it and use today's rate
    if (date.getTime() <= now.getTime()) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      url += `?date=${day}.${month}.${year}`
    }
  }

  const response = await fetch(url)
  const text = await response.text()
  const lines = text.split('\n')
  // skip first two lines - they are headers
  const currencyLine = lines.slice(2).find((line) => {
    const parts = line.split('|')
    return parts[3] === currency
  })
  if (!currencyLine) {
    return null
  }
  const parts = currencyLine.split('|')
  const rate = parseFloat(parts[4].replace(',', '.'))
  const amount = parseFloat(parts[2].replace(',', '.'))
  return rate / amount
}
