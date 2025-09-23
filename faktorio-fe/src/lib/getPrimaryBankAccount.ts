import type { RouterOutputs } from '@/lib/trpcClient'

export type PrimaryBankAccount = {
  id?: string | null
  label?: string | null
  bank_account?: string | null
  iban?: string | null
  swift_bic?: string | null
  qrcode_decoded?: string | null
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === 'true'
  return false
}

export const getPrimaryBankAccount = (
  details: RouterOutputs['invoicingDetails'] | undefined
): PrimaryBankAccount => {
  if (!details) {
    return {
      id: null,
      label: null,
      bank_account: null,
      iban: null,
      swift_bic: null,
      qrcode_decoded: null
    }
  }

  const accounts = details.bankAccounts ?? []
  const defaultAccount =
    accounts.find((account) => toBoolean(account.is_default)) ?? accounts[0]

  if (defaultAccount) {
    return {
      id: defaultAccount.id ?? null,
      label: defaultAccount.label ?? null,
      bank_account: defaultAccount.bank_account ?? null,
      iban: defaultAccount.iban ?? details.iban ?? null,
      swift_bic: defaultAccount.swift_bic ?? details.swift_bic ?? null,
      qrcode_decoded: defaultAccount.qrcode_decoded ?? null
    }
  }

  return {
    id: null,
    label: null,
    bank_account: null,
    iban: details.iban ?? null,
    swift_bic: details.swift_bic ?? null,
    qrcode_decoded: null
  }
}
