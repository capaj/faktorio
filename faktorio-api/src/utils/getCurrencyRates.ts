export async function getCurrencyRates() {
  const res = await fetch('https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt')
  const text = await res.text()
  const lines = text.split('\n').slice(2)
  const rates: Record<string, number> = {}
  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length > 4) {
      const code = parts[3]
      const rateString = parts[4]?.replace(',', '.')
      const normalized = parseFloat(rateString)
      if (!isNaN(normalized)) {
        rates[code] = normalized
      }
    }
  }
  return rates
}