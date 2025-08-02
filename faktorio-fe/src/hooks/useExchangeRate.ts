import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { trpcClient } from '@/lib/trpcClient'
import { djs } from 'faktorio-shared/src/djs'

interface UseExchangeRateProps {
  currency: string
  taxableFulfillmentDue: string
  form: UseFormReturn<any>
}

export const useExchangeRate = ({
  currency,
  taxableFulfillmentDue,
  form
}: UseExchangeRateProps) => {
  const utils = trpcClient.useUtils()

  useEffect(() => {
    if (!currency || currency.length !== 3) {
      return
    }

    if (currency === 'CZK') {
      form.setValue('exchange_rate', 1)
      return
    }

    const fetchRate = async () => {
      try {
        const rate = await utils.invoices.getExchangeRate.fetch({
          currency: currency,
          date: djs(taxableFulfillmentDue).format('YYYY-MM-DD')
        })
        if (rate !== null) {
          form.setValue('exchange_rate', rate)
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error)
      }
    }
    fetchRate()
  }, [currency, taxableFulfillmentDue, form, utils.invoices.getExchangeRate])
}
