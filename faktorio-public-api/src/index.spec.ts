import { describe, it, expect, beforeAll } from 'vitest'
import worker from './index'
import { seedDb, TEST_API_TOKEN, TEST_SHARE_ID } from '../scripts/seed'

// For now, you'll need to do something like this to get a correctly-typed `Request`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

describe('Public API', () => {
  beforeAll(async () => {
    await seedDb()
  })
  it('GET /invoices returns invoices for seeded user', async () => {
    const url = new URL('http://faktorio.cz/invoices')
    url.searchParams.set('limit', '10')
    const request = new IncomingRequest(url.toString(), {
      headers: {
        'X-API-KEY': 'tok_faktorio_public_api_test_0000000000000000000'
      }
    })

    const response = await worker.fetch(request, {
      TURSO_DATABASE_URL: 'file:test.sqlite'
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { invoices: unknown[] }
    expect(body).toHaveProperty('invoices')
    expect(Array.isArray(body.invoices)).toBe(true)
    // We have 1 seeded invoice for shared invoice testing
    expect(body.invoices.length).toBeGreaterThanOrEqual(1)
  })

  it('POST /invoices creates invoice and GET returns it', async () => {
    const createUrl = new URL('http://faktorio.cz/invoices')
    const request = new IncomingRequest(createUrl.toString(), {
      method: 'POST',
      headers: {
        'X-API-KEY': TEST_API_TOKEN,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        invoice: {
          number: '2024-API-001',
          client_contact_id: 'cnt_public_api_test_1',
          taxable_fulfillment_due: '2024-01-15',
          issued_on: '2024-01-15',
          due_in_days: 14,
          payment_method: 'bank',
          currency: 'CZK'
        },
        items: [
          {
            description: 'Work',
            quantity: 10,
            unit_price: 1000,
            unit: 'h',
            vat_rate: 21
          }
        ]
      })
    })

    const createRes = await worker.fetch(request, {
      TURSO_DATABASE_URL: 'file:test.sqlite'
    })

    expect(createRes.status).toBe(201)
    const createBody = (await createRes.json()) as { id: string }
    expect(typeof createBody.id).toBe('string')

    const getUrl = new URL(`http://faktorio.cz/invoices/${createBody.id}`)
    const getReq = new IncomingRequest(getUrl.toString(), {
      headers: { 'X-API-KEY': TEST_API_TOKEN }
    })
    const getRes = await worker.fetch(getReq, {
      TURSO_DATABASE_URL: 'file:test.sqlite'
    })
    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as {
      invoice: { id: string }
      items: unknown[]
    }
    expect(getBody.invoice.id).toBe(createBody.id)
    expect(getBody.items.length).toBe(1)
  })

  it('GET /shared-invoice/:shareId returns invoice with vatPayer', async () => {
    const url = new URL(`http://faktorio.cz/shared-invoice/${TEST_SHARE_ID}`)
    const request = new IncomingRequest(url.toString())

    const response = await worker.fetch(request, {
      TURSO_DATABASE_URL: 'file:test.sqlite'
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      invoice: { id: string; number: string }
      items: unknown[]
      share: { id: string }
      vatPayer: boolean
    }
    expect(body.invoice.number).toBe('2024-SHARE-001')
    expect(body.share.id).toBe(TEST_SHARE_ID)
    expect(typeof body.vatPayer).toBe('boolean')
    // Default vat_payer in seed is true
    expect(body.vatPayer).toBe(true)
  })

  it('GET /shared-invoice/:shareId returns 404 for non-existent share', async () => {
    const url = new URL('http://faktorio.cz/shared-invoice/non_existent_share')
    const request = new IncomingRequest(url.toString())

    const response = await worker.fetch(request, {
      TURSO_DATABASE_URL: 'file:test.sqlite'
    })

    expect(response.status).toBe(404)
  })
})
