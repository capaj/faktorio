import { z } from 'zod/v4'

const RECEIVED_INVOICE_DRAFT_VERSION = 1
const RECEIVED_INVOICE_DRAFT_STORAGE_KEY_PREFIX =
  'faktorio.received-invoice-draft'

export const RECEIVED_INVOICE_FORM_DEFAULT_VALUES = {
  supplier_name: '',
  invoice_number: '',
  currency: 'CZK',
  supplier_country: 'Česká republika'
} satisfies ReceivedInvoiceDraft

export type ReceivedInvoiceDraft = {
  supplier_name?: string
  supplier_registration_no?: string | null
  supplier_vat_no?: string | null
  supplier_street?: string | null
  supplier_city?: string | null
  supplier_zip?: string | null
  supplier_country?: string | null
  invoice_number?: string
  variable_symbol?: string | null
  expense_category?: string | null
  issue_date?: Date
  taxable_supply_date?: Date | null
  due_date?: Date
  receipt_date?: Date | null
  total_without_vat?: number | null
  total_with_vat?: number
  currency?: string
  line_items_summary?: string | null
}

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const serializedReceivedInvoiceDraftSchema = z.object({
  version: z.literal(RECEIVED_INVOICE_DRAFT_VERSION),
  values: z.object({
    supplier_name: z.string().optional(),
    supplier_registration_no: z.string().nullish(),
    supplier_vat_no: z.string().nullish(),
    supplier_street: z.string().nullish(),
    supplier_city: z.string().nullish(),
    supplier_zip: z.string().nullish(),
    supplier_country: z.string().nullish(),
    invoice_number: z.string().optional(),
    variable_symbol: z.string().nullish(),
    expense_category: z.string().nullish(),
    issue_date: z.string().optional(),
    taxable_supply_date: z.string().nullish(),
    due_date: z.string().optional(),
    receipt_date: z.string().nullish(),
    total_without_vat: z.number().nullish(),
    total_with_vat: z.number().optional(),
    currency: z.string().optional(),
    line_items_summary: z.string().nullish()
  })
})

export const getReceivedInvoiceDraftStorageKey = (userId: string) =>
  `${RECEIVED_INVOICE_DRAFT_STORAGE_KEY_PREFIX}.v${RECEIVED_INVOICE_DRAFT_VERSION}.${userId}`

export const getReceivedInvoiceDraftStorage = (): DraftStorage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const parseDate = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const serializeDate = (value: Date | null | undefined) => {
  if (value === null || value === undefined) {
    return value
  }

  return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
}

const hasMeaningfulDraftValue = (values: ReceivedInvoiceDraft) =>
  Object.entries(values).some(([field, value]) => {
    if (value === undefined || value === null || value === '') {
      return false
    }

    if (field === 'currency') {
      return value !== RECEIVED_INVOICE_FORM_DEFAULT_VALUES.currency
    }

    if (field === 'supplier_country') {
      return value !== RECEIVED_INVOICE_FORM_DEFAULT_VALUES.supplier_country
    }

    return true
  })

export const clearReceivedInvoiceDraft = (
  storage: DraftStorage | null,
  userId: string | undefined
) => {
  if (!storage || !userId) {
    return
  }

  try {
    storage.removeItem(getReceivedInvoiceDraftStorageKey(userId))
  } catch {
    // Draft persistence should never prevent the invoice form from working.
  }
}

export const saveReceivedInvoiceDraft = (
  storage: DraftStorage | null,
  userId: string | undefined,
  values: ReceivedInvoiceDraft
) => {
  if (!storage || !userId) {
    return
  }

  if (!hasMeaningfulDraftValue(values)) {
    clearReceivedInvoiceDraft(storage, userId)
    return
  }

  const serializedValues = {
    ...values,
    issue_date: serializeDate(values.issue_date),
    taxable_supply_date: serializeDate(values.taxable_supply_date),
    due_date: serializeDate(values.due_date),
    receipt_date: serializeDate(values.receipt_date)
  }

  try {
    storage.setItem(
      getReceivedInvoiceDraftStorageKey(userId),
      JSON.stringify({
        version: RECEIVED_INVOICE_DRAFT_VERSION,
        values: serializedValues
      })
    )
  } catch {
    // localStorage can be disabled or full; keep the form usable in that case.
  }
}

export const loadReceivedInvoiceDraft = (
  storage: DraftStorage | null,
  userId: string | undefined
): ReceivedInvoiceDraft | null => {
  if (!storage || !userId) {
    return null
  }

  try {
    const serializedDraft = storage.getItem(
      getReceivedInvoiceDraftStorageKey(userId)
    )

    if (!serializedDraft) {
      return null
    }

    const result = serializedReceivedInvoiceDraftSchema.safeParse(
      JSON.parse(serializedDraft)
    )

    if (!result.success) {
      clearReceivedInvoiceDraft(storage, userId)
      return null
    }

    const draft: ReceivedInvoiceDraft = {
      ...RECEIVED_INVOICE_FORM_DEFAULT_VALUES,
      ...result.data.values,
      issue_date: parseDate(result.data.values.issue_date) ?? undefined,
      taxable_supply_date: parseDate(result.data.values.taxable_supply_date),
      due_date: parseDate(result.data.values.due_date) ?? undefined,
      receipt_date: parseDate(result.data.values.receipt_date)
    }

    if (!hasMeaningfulDraftValue(draft)) {
      clearReceivedInvoiceDraft(storage, userId)
      return null
    }

    return draft
  } catch {
    clearReceivedInvoiceDraft(storage, userId)
    return null
  }
}
