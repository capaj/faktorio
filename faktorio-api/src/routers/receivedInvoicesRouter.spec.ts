import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { receivedInvoicesRouter } from './receivedInvoicesRouter'

const extractedInvoice = {
  supplier_name: 'Dodavatel s.r.o.',
  invoice_number: '2026-001',
  issue_date: '2026-03-01',
  due_date: '2026-03-15',
  total_with_vat: 1210,
  currency: 'CZK',
  supplier_street: null,
  supplier_street2: null,
  supplier_city: null,
  supplier_zip: null,
  supplier_country: null,
  supplier_registration_no: null,
  supplier_vat_no: null,
  supplier_email: null,
  supplier_phone: null,
  internal_number: null,
  variable_symbol: null,
  expense_category: null,
  taxable_supply_date: null,
  receipt_date: null,
  payment_date: null,
  total_without_vat: null,
  exchange_rate: null,
  vat_base_21: null,
  vat_21: null,
  vat_base_15: null,
  vat_15: null,
  vat_base_10: null,
  vat_10: null,
  vat_base_0: null,
  reverse_charge: null,
  vat_regime: null,
  payment_method: null,
  bank_account: null,
  iban: null,
  swift_bic: null,
  items: null,
  status: null,
  line_items_summary: null
}

function createCaller(apiKey = 'test-openrouter-key') {
  return receivedInvoicesRouter.createCaller({
    db: {} as any,
    env: { OPENROUTER_API_KEY: apiKey } as any,
    user: { id: 'user-1' } as any,
    req: new Request('http://localhost/trpc'),
    generateToken: vi.fn() as any,
    sendEmail: vi.fn() as any
  })
}

function completion(
  content: string | null = JSON.stringify(extractedInvoice),
  finishReason = 'stop',
  reasoning?: string
) {
  return Response.json({
    id: 'test-completion',
    model: 'meta/muse-spark-1.3-contributor',
    created: 1,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content, reasoning },
        finish_reason: finishReason
      }
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  })
}

const imageInput = {
  mimeType: 'image/png',
  imageData: 'data:image/png;base64,Zm9vYmFy'
}

describe('receivedInvoicesRouter.extractInvoiceData', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(completion())
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => { })
    vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends images and a JSON schema through the AI SDK OpenRouter provider', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    expect(await createCaller().extractInvoiceData(imageInput)).toEqual(
      extractedInvoice
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer test-openrouter-key'
    )
    const body = JSON.parse(init?.body as string)

    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.strict).toBe(true)
    const schema = body.response_format.json_schema.schema
    function expectStrictObjects(node: any) {
      if (!node || typeof node !== 'object') return
      if (node.type === 'object') {
        expect([...node.required].sort()).toEqual(
          Object.keys(node.properties).sort()
        )
        expect(node.additionalProperties).toBe(false)
      }
      for (const value of Object.values(node)) expectStrictObjects(value)
    }
    expectStrictObjects(schema)
    expect(schema.required).toContain('bank_account')

    expect(
      body.response_format.json_schema.schema.properties.issue_date
    ).toBeTruthy()
    expect(body.messages[1].content[1]).toEqual({
      type: 'image_url',
      image_url: { url: imageInput.imageData }
    })
    expect(timeout).toHaveBeenCalledWith(45000)
  })

  it.each(['JVBERi0xLjQK', 'data:application/pdf;base64,JVBERi0xLjQK'])(
    'sends PDFs inline without uploading a temporary file (%s)',
    async (imageData) => {
      expect(
        await createCaller().extractInvoiceData({
          mimeType: 'application/pdf',
          imageData
        })
      ).toEqual(extractedInvoice)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(body.messages[1].content[1]).toEqual({
        type: 'file',
        file: {
          filename: 'invoice.pdf',
          file_data: 'data:application/pdf;base64,JVBERi0xLjQK'
        }
      })
    }
  )

  it('does not retry provider failures', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { message: 'Deadline expired', code: 504 } },
        { status: 504 }
      )
    )
    await expect(
      createCaller().extractInvoiceData(imageInput)
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([null, '', '{"supplier_name":', JSON.stringify(extractedInvoice)])(
    'reports token exhaustion without returning incomplete data (%s)',
    async (content) => {
      fetchMock.mockResolvedValue(
        completion(content, 'length', 'Still analyzing the invoice.')
      )
      await expect(
        createCaller().extractInvoiceData(imageInput)
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'Invoice extraction reached the output token limit before completing. Try processing fewer pages at a time.'
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(['stop', 'content_filter'])(
    'reports empty responses with finish reason %s',
    async (finishReason) => {
      fetchMock.mockResolvedValue(completion(null, finishReason))
      await expect(
        createCaller().extractInvoiceData(imageInput)
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'The invoice model returned no extraction data. Please try again.'
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it('extracts JSON when the model also returns reasoning', async () => {
    fetchMock.mockResolvedValue(
      completion(JSON.stringify(extractedInvoice), 'stop', 'Invoice analyzed.')
    )
    expect(await createCaller().extractInvoiceData(imageInput)).toEqual(
      extractedInvoice
    )
  })

  it('reports invalid credentials', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { message: 'Invalid API key', code: 401 } },
        { status: 401 }
      )
    )
    await expect(
      createCaller().extractInvoiceData(imageInput)
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'OpenRouter API key is invalid in backend configuration. Update OPENROUTER_API_KEY.'
    })
  })

  it('reports a missing key before calling the provider', async () => {
    await expect(
      createCaller('').extractInvoiceData(imageInput)
    ).rejects.toMatchObject({ message: 'OPENROUTER_API_KEY is not configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['not json at all', 'Failed to parse OCR results'],
    [
      JSON.stringify({ ...extractedInvoice, issue_date: 'invalid' }),
      'OCR results did not match expected format'
    ]
  ])('rejects invalid extraction output (%s)', async (content, message) => {
    fetchMock.mockResolvedValue(completion(content))
    await expect(
      createCaller().extractInvoiceData(imageInput)
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', message })
  })

  it('rejects omitted fields in strict output', async () => {
    fetchMock.mockResolvedValue(
      completion(
        JSON.stringify({ ...extractedInvoice, bank_account: undefined })
      )
    )
    await expect(
      createCaller().extractInvoiceData(imageInput)
    ).rejects.toMatchObject({
      message: 'OCR results did not match expected format'
    })
  })

  it('validates nullable fields inside invoice line items', async () => {
    const invoice = {
      ...extractedInvoice,
      items: [
        {
          description: 'Service',
          quantity: 1,
          unit_price: 1000,
          unit: null,
          vat_rate: 21,
          total_without_vat: 1000,
          total_with_vat: 1210,
          accounting_code: null
        }
      ]
    }
    fetchMock.mockResolvedValue(completion(JSON.stringify(invoice)))
    expect(await createCaller().extractInvoiceData(imageInput)).toEqual(invoice)
  })

  it('preserves nullable fields, credit note amounts, and the default currency', async () => {
    const invoice = {
      ...extractedInvoice,
      currency: null,
      total_with_vat: -1210,
      supplier_city: null,
      items: null
    }
    fetchMock.mockResolvedValue(completion(JSON.stringify(invoice)))
    expect(await createCaller().extractInvoiceData(imageInput)).toEqual({
      ...invoice,
      currency: 'CZK'
    })
  })
})
