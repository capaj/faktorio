import { djs } from '../../../../src/djs'

export async function getCNBExchangeRate(params: {
  currency: string
  date?: string | null
}): Promise<number | null> {
  const { currency, date } = params
  if (currency === 'CZK') {
    return 1
  }

  let url =
    'https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt'
  if (date) {
    const dayjsDate = djs(date)
    // if date is in the future, we ignore it and use today's rate
    if (dayjsDate.isBefore(djs())) {
      const day = date.split('-')[2]
      const month = date.split('-')[1]
      const year = date.split('-')[0]
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
