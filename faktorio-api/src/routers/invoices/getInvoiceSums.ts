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
  return {
    subtotal: subtotal,
    total: subtotal + subTotalVat,
    native_subtotal: subtotal,
    native_total: subtotal + subTotalVat
  }
}
