interface InvoiceTotalsProps {
  total: number
  totalVat: number
  currency: string
  vatPayer?: boolean
  exchangeRate: number
  isCzkInvoice: boolean
}

export const InvoiceTotals = ({
  total,
  totalVat,
  currency,
  vatPayer,
  exchangeRate,
  isCzkInvoice
}: InvoiceTotalsProps) => {
  return (
    <div className="grid grid-cols-2 gap-6 mt-8">
      <>
        {isCzkInvoice && (
          <span className="text-sm text-gray-500">
            Celkem: {(total * exchangeRate).toFixed(2)} CZK
          </span>
        )}
        <h3
          className={`text-md text-right ${isCzkInvoice ? '' : 'col-span-2'}`}
        >
          Celkem: {total.toFixed(2)} {currency}
        </h3>
        {vatPayer && (
          <>
            {isCzkInvoice && (
              <span className="text-sm text-gray-500">
                DPH: {(totalVat * exchangeRate).toFixed(2)} CZK
              </span>
            )}
            <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
              DPH: {totalVat.toFixed(2)} {currency}
            </h3>

            {isCzkInvoice && (
              <span className="text-sm text-gray-500">
                Celkem s DPH: {((total + totalVat) * exchangeRate).toFixed(2)}{' '}
                CZK
              </span>
            )}
            <h3 className={`text-right ${isCzkInvoice ? '' : 'col-span-2'}`}>
              Celkem s DPH: {(total + totalVat).toFixed(2)} {currency}
            </h3>
          </>
        )}
      </>
    </div>
  )
}
