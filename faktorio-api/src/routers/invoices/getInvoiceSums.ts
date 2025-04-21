export function getInvoiceSums(
  invoiceItems: {
    id?: number | undefined
    created_at?: string | undefined
    updated_at?: string | null | undefined
    description?: string | null | undefined
    order?: number | null | undefined
    quantity?: number | null | undefined
    unit_price?: number | null | undefined
    unit?: string | null | undefined
    vat_rate?: number | null | undefined
  }[]
) {
  const subtotal = invoiceItems.reduce(
    (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
    0
  )

  // Filter items by VAT rate and calculate base amounts
  const vatBase21 = invoiceItems
    .filter((item) => item.vat_rate === 21)
    .reduce(
      (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    )

  const vatBase12 = invoiceItems
    .filter((item) => item.vat_rate === 12) // Updated to 12%
    .reduce(
      (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    )

  const vatBase0 = invoiceItems
    .filter((item) => item.vat_rate === 0)
    .reduce(
      (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    )

  // Calculate VAT amounts for each rate
  const vat21 = vatBase21 * 0.21
  const vat12 = vatBase12 * 0.12
  const vat0 = 0 // VAT for 0% base is always 0

  // Calculate total by summing subtotal and individual VAT amounts
  const total = subtotal + vat21 + vat12 + vat0

  return {
    subtotal: subtotal,
    total: total,
    native_subtotal: subtotal,
    native_total: total,
    vat_base_21: vatBase21,
    vat_21: vat21,
    vat_base_12: vatBase12,
    vat_12: vat12,
    vat_base_0: vatBase0
  }
}
