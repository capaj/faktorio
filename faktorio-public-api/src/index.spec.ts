import { describe, it, expect, beforeAll } from 'vitest'
import worker from './index'
import { seedDb } from '../scripts/seed'

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
})
