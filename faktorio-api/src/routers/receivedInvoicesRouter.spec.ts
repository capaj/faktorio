import { beforeEach, describe, expect, it, vi } from 'vitest'
import { receivedInvoicesRouter } from './receivedInvoicesRouter'

const extractedInvoice = {
  supplier_name: 'Dodavatel s.r.o.',
  invoice_number: '2026-001',
  issue_date: '2026-03-01',
  due_date: '2026-03-15',
  total_with_vat: 1210,
  currency: 'CZK'
}

function createCaller(
  generateContent: ReturnType<typeof vi.fn>,
  fileManagerOverrides?: {
    uploadFile?: ReturnType<typeof vi.fn>
    getFile?: ReturnType<typeof vi.fn>
    deleteFile?: ReturnType<typeof vi.fn>
  }
) {
  return receivedInvoicesRouter.createCaller({
    db: {} as any,
    env: {} as any,
    user: {
      id: 'user-1'
    } as any,
    req: new Request('http://localhost/trpc'),
    generateToken: vi.fn() as any,
    sendEmail: vi.fn() as any,
    googleGenAIFileManager: {
      uploadFile: fileManagerOverrides?.uploadFile ?? vi.fn(),
      getFile: fileManagerOverrides?.getFile ?? vi.fn(),
      deleteFile: fileManagerOverrides?.deleteFile ?? vi.fn()
    } as any,
    googleGenAI: {
      models: {
        generateContent
      }
    } as any
  })
}

describe('receivedInvoicesRouter.extractInvoiceData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('uses Gemini JSON mode and strips data URI prefixes before sending inline data', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(extractedInvoice)
    })
    const caller = createCaller(generateContent)

    const result = await caller.extractInvoiceData({
      mimeType: 'image/png',
      imageData: 'data:image/png;base64,Zm9vYmFy'
    })

    expect(result).toEqual(extractedInvoice)
    expect(generateContent).toHaveBeenCalledTimes(1)

    const params = generateContent.mock.calls[0][0]
    expect(params.model).toBe('gemini-3-flash-preview')
    expect(params.config.responseMimeType).toBe('application/json')
    expect(params.config.responseSchema).toBeTruthy()
    expect(params.contents[0].parts[1].inlineData).toEqual({
      mimeType: 'image/png',
      data: 'Zm9vYmFy'
    })
  })

  it('keeps using gemini-3 for PDFs and sends them as fileData', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: `Here is the extracted invoice:\n\n\`\`\`json\n${JSON.stringify(extractedInvoice, null, 2)}\n\`\`\``
    })
    const uploadFile = vi.fn().mockResolvedValue({
      file: {
        name: 'files/invoice-1',
        state: 'ACTIVE',
        uri: 'gs://gemini/invoice-1',
        mimeType: 'application/pdf'
      }
    })
    const deleteFile = vi.fn().mockResolvedValue(undefined)
    const caller = createCaller(generateContent, {
      uploadFile,
      deleteFile
    })

    const result = await caller.extractInvoiceData({
      mimeType: 'application/pdf',
      imageData: 'JVBERi0xLjQK'
    })

    expect(result).toEqual(extractedInvoice)
    expect(generateContent).toHaveBeenCalledTimes(1)

    const params = generateContent.mock.calls[0][0]
    expect(params.model).toBe('gemini-3-flash-preview')
    expect(params.config.httpOptions.timeout).toBe(25000)
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal)
    expect(params.contents[0].parts[1].fileData).toEqual({
      fileUri: 'gs://gemini/invoice-1',
      mimeType: 'application/pdf'
    })
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(deleteFile).toHaveBeenCalledWith('files/invoice-1')
  })

  it('retries PDFs with a smaller same-model extraction when the full attempt hits deadline exceeded', async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce({
        status: 504,
        message: 'Deadline expired before operation could complete. DEADLINE_EXCEEDED'
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(extractedInvoice)
      })
    const uploadFile = vi.fn().mockResolvedValue({
      file: {
        name: 'files/invoice-2',
        state: 'ACTIVE',
        uri: 'gs://gemini/invoice-2',
        mimeType: 'application/pdf'
      }
    })
    const deleteFile = vi.fn().mockResolvedValue(undefined)
    const caller = createCaller(generateContent, {
      uploadFile,
      deleteFile
    })

    const result = await caller.extractInvoiceData({
      mimeType: 'application/pdf',
      imageData: 'JVBERi0xLjQK'
    })

    expect(result).toEqual(extractedInvoice)
    expect(generateContent).toHaveBeenCalledTimes(2)
    expect(uploadFile).toHaveBeenCalledTimes(1)

    const firstCall = generateContent.mock.calls[0][0]
    const secondCall = generateContent.mock.calls[1][0]

    expect(firstCall.model).toBe('gemini-3-flash-preview')
    expect(firstCall.config.httpOptions.timeout).toBe(25000)
    expect(firstCall.contents[0].parts[1].fileData).toEqual({
      fileUri: 'gs://gemini/invoice-2',
      mimeType: 'application/pdf'
    })

    expect(secondCall.model).toBe('gemini-3-flash-preview')
    expect(secondCall.config.httpOptions.timeout).toBe(15000)
    expect(secondCall.contents[0].parts[1].fileData).toEqual({
      fileUri: 'gs://gemini/invoice-2',
      mimeType: 'application/pdf'
    })
    expect(deleteFile).toHaveBeenCalledWith('files/invoice-2')
  })
})
