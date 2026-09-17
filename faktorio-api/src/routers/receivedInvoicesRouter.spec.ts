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
    expect(params.model).toBe('gemini-3.8-flash')
    expect(params.config.responseMimeType).toBe('application/json')
    expect(params.config.responseSchema).toBeTruthy()
    expect(params.config.httpOptions.timeout).toBe(45000)
    expect(params.contents[0].parts[1].inlineData).toEqual({
      mimeType: 'image/png',
      data: 'Zm9vYmFy'
    })
  })

  it('sends PDFs as fileData with a single full extraction', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(extractedInvoice)
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
    expect(params.model).toBe('gemini-3.8-flash')
    expect(params.config.httpOptions.timeout).toBe(45000)
    expect(params.contents[0].parts[1].fileData).toEqual({
      fileUri: 'gs://gemini/invoice-1',
      mimeType: 'application/pdf'
    })
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(deleteFile).toHaveBeenCalledWith('files/invoice-1')
  })

  it('fails fast instead of retrying with a partial extraction when Gemini errors', async () => {
    const generateContent = vi.fn().mockRejectedValueOnce({
      status: 504,
      message: 'Deadline expired before operation could complete.'
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

    await expect(
      caller.extractInvoiceData({
        mimeType: 'application/pdf',
        imageData: 'JVBERi0xLjQK'
      })
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })

    expect(generateContent).toHaveBeenCalledTimes(1)
    expect(uploadFile).toHaveBeenCalledTimes(1)
    // The uploaded temp file is still cleaned up
    expect(deleteFile).toHaveBeenCalledWith('files/invoice-2')
  })

  it('returns a clear error when Gemini does not return valid JSON', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: 'not json at all'
    })
    const caller = createCaller(generateContent)

    await expect(
      caller.extractInvoiceData({
        mimeType: 'image/png',
        imageData: 'Zm9vYmFy'
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to parse OCR results'
    })
  })
})
