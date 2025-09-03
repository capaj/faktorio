import { describe, it, expect, beforeAll } from 'vitest'
import worker from './index'
import { seedDb, TEST_API_TOKEN } from '../scripts/seed'

// For now, you'll need to do something like this to get a correctly-typed `Request`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

describe('Public API', () => {
  beforeAll(async () => {
    await seedDb()
  })
  it('GET /invoices returns empty list for seeded user', async () => {
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
    const body = (await response.json()) as { invoices: any[] }
    expect(body).toHaveProperty('invoices')
    expect(Array.isArray(body.invoices)).toBe(true)
    expect(body.invoices.length).toBe(0)
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
      invoice: any
      items: any[]
    }
    expect(getBody.invoice.id).toBe(createBody.id)
    expect(getBody.items.length).toBe(1)
  })
})
