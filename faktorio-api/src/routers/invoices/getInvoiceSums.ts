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
  const subTotalVat = invoiceItems.reduce(
    (acc, item) =>
      acc +
      ((item.quantity ?? 0) * (item.unit_price ?? 0) * (item.vat_rate ?? 0)) /
        100,
    0
  )

  // Filter items by VAT rate and calculate base amounts
  const vatBase21 = invoiceItems
    .filter((item) => item.vat_rate === 21)
    .reduce(
      (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    )

  const vatBase15 = invoiceItems
    .filter((item) => item.vat_rate === 15)
    .reduce(
      (acc, item) => acc + (item.quantity ?? 0) * (item.unit_price ?? 0),
      0
    )

  const vatBase10 = invoiceItems
    .filter((item) => item.vat_rate === 10)
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

  return {
    subtotal: subtotal,
    total: subtotal + subTotalVat,
    native_subtotal: subtotal,
    native_total: subtotal + subTotalVat,
    vat_base_21: vatBase21,
    vat_21: vatBase21 * 0.21,
    vat_base_15: vatBase15,
    vat_15: vatBase15 * 0.15,
    vat_base_10: vatBase10,
    vat_10: vatBase10 * 0.1,
    vat_base_0: vatBase0
  }
}
