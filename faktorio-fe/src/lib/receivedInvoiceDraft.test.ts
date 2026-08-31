import { describe, expect, it } from 'vitest'
import {
  RECEIVED_INVOICE_FORM_DEFAULT_VALUES,
  getReceivedInvoiceDraftStorageKey,
  loadReceivedInvoiceDraft,
  saveReceivedInvoiceDraft,
  type DraftStorage
} from './receivedInvoiceDraft'

const createMemoryStorage = (): DraftStorage => {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

describe('received invoice draft persistence', () => {
  it('restores saved field values and revives dates', () => {
    const storage = createMemoryStorage()
    const issueDate = new Date('2026-08-20T00:00:00.000Z')
    const dueDate = new Date('2026-09-03T00:00:00.000Z')

    saveReceivedInvoiceDraft(storage, 'user-1', {
      ...RECEIVED_INVOICE_FORM_DEFAULT_VALUES,
      supplier_name: 'Draft supplier',
      invoice_number: 'INV-42',
      issue_date: issueDate,
      due_date: dueDate,
      total_with_vat: 1250
    })

    expect(loadReceivedInvoiceDraft(storage, 'user-1')).toEqual({
      ...RECEIVED_INVOICE_FORM_DEFAULT_VALUES,
      supplier_name: 'Draft supplier',
      invoice_number: 'INV-42',
      issue_date: issueDate,
      due_date: dueDate,
      total_with_vat: 1250,
      taxable_supply_date: undefined,
      receipt_date: undefined
    })
  })

  it('removes storage when the form returns to its untouched defaults', () => {
    const storage = createMemoryStorage()

    saveReceivedInvoiceDraft(storage, 'user-1', {
      supplier_name: 'Draft supplier'
    })
    saveReceivedInvoiceDraft(
      storage,
      'user-1',
      RECEIVED_INVOICE_FORM_DEFAULT_VALUES
    )

    expect(
      storage.getItem(getReceivedInvoiceDraftStorageKey('user-1'))
    ).toBeNull()
  })

  it('keeps drafts isolated by user', () => {
    const storage = createMemoryStorage()

    saveReceivedInvoiceDraft(storage, 'user-1', {
      supplier_name: 'Only for user 1'
    })

    expect(loadReceivedInvoiceDraft(storage, 'user-2')).toBeNull()
    expect(loadReceivedInvoiceDraft(storage, 'user-1')).toMatchObject({
      ...RECEIVED_INVOICE_FORM_DEFAULT_VALUES,
      supplier_name: 'Only for user 1'
    })
  })

  it('discards malformed stored data', () => {
    const storage = createMemoryStorage()
    const key = getReceivedInvoiceDraftStorageKey('user-1')
    storage.setItem(key, '{invalid json')

    expect(loadReceivedInvoiceDraft(storage, 'user-1')).toBeNull()
    expect(storage.getItem(key)).toBeNull()
  })
})
