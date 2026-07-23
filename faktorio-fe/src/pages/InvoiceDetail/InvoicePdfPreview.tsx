import { useEffect, useRef, useState } from 'react'
import { usePDF, type DocumentProps } from '@react-pdf/renderer'
import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask
} from 'pdfjs-dist/types/src/display/api'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

type InvoicePdfPreviewProps = {
  document: React.ReactElement<DocumentProps>
  className?: string
}

export function InvoicePdfPreview({
  document,
  className
}: InvoicePdfPreviewProps) {
  const [instance, updateInstance] = usePDF()
  const [loadedPdf, setLoadedPdf] = useState<{
    sourceBlob: Blob
    document: PDFDocumentProxy
  } | null>(null)
  const [renderError, setRenderError] = useState<{
    sourceBlob: Blob
    message: string
  } | null>(null)

  useEffect(() => {
    updateInstance(document)
  }, [document, updateInstance])

  useEffect(() => {
    const sourceBlob = instance.blob
    if (!sourceBlob) return

    let cancelled = false
    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null

    const loadDocument = async () => {
      try {
        const data = new Uint8Array(await sourceBlob.arrayBuffer())
        if (cancelled) return

        loadingTask = pdfjs.getDocument({ data })
        const loadedPdf = await loadingTask.promise

        if (cancelled) return

        setLoadedPdf({
          sourceBlob,
          document: loadedPdf
        })
        setRenderError(null)
      } catch (error) {
        if (!cancelled) {
          setRenderError({
            sourceBlob,
            message: String(error)
          })
          setLoadedPdf(null)
        }
      }
    }

    void loadDocument()

    return () => {
      cancelled = true
      void loadingTask?.destroy().catch((error) => {
        console.error('Unable to destroy PDF preview', error)
      })
    }
  }, [instance.blob])

  // React-PDF can publish a new blob before the effect above has loaded it in
  // PDF.js. Never expose the previous document during that gap: its loading
  // task is destroyed by the effect cleanup and getPage() can no longer use it.
  const pdfDocument =
    loadedPdf?.sourceBlob === instance.blob ? loadedPdf.document : null
  const pdfRenderError =
    renderError?.sourceBlob === instance.blob ? renderError.message : null
  const error = instance.error ? String(instance.error) : pdfRenderError
  const isLoading =
    instance.loading || (!!instance.blob && !pdfDocument && !error)
  const pageNumbers = pdfDocument
    ? Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1)
    : []

  return (
    <div className={`min-h-[700px] bg-zinc-900 p-4 sm:p-8 ${className ?? ''}`}>
      {isLoading && (
        <div className="flex min-h-[620px] items-center justify-center text-sm text-zinc-300">
          Připravuji náhled PDF...
        </div>
      )}

      {error && (
        <div className="flex min-h-[620px] items-center justify-center px-4 text-center text-sm text-red-200">
          Náhled PDF se nepodařilo vykreslit: {error}
        </div>
      )}

      {!isLoading && !error && pdfDocument && (
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6">
          {pageNumbers.map((pageNumber) => (
            <PdfCanvasPage
              key={`${instance.url ?? 'pdf'}-${pageNumber}`}
              pdfDocument={pdfDocument}
              pageNumber={pageNumber}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PdfCanvasPage({
  pdfDocument,
  pageNumber
}: {
  pdfDocument: PDFDocumentProxy
  pageNumber: number
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  useEffect(() => {
    let cancelled = false

    setPage(null)

    const loadPage = async () => {
      try {
        const loadedPage = await pdfDocument.getPage(pageNumber)
        if (!cancelled) {
          setPage(loadedPage)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`Unable to load PDF page ${pageNumber}`, error)
        }
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [pdfDocument, pageNumber])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width)
    })

    observer.observe(wrapper)
    setAvailableWidth(wrapper.clientWidth)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !page || availableWidth <= 0) return

    const context = canvas.getContext('2d')
    if (!context) return

    renderTaskRef.current?.cancel()

    const baseViewport = page.getViewport({ scale: 1 })
    const cssWidth = Math.min(availableWidth, baseViewport.width)
    const scale = cssWidth / baseViewport.width
    const viewport = page.getViewport({ scale })
    const pixelRatio = window.devicePixelRatio || 1

    canvas.width = Math.floor(viewport.width * pixelRatio)
    canvas.height = Math.floor(viewport.height * pixelRatio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, viewport.width, viewport.height)

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport
    })
    renderTaskRef.current = renderTask

    renderTask.promise.catch((error) => {
      if (error?.name !== 'RenderingCancelledException') {
        console.error('Unable to render PDF page', error)
      }
    })

    return () => {
      renderTask.cancel()
    }
  }, [page, availableWidth])

  return (
    <div ref={wrapperRef} className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full bg-white shadow-lg"
        aria-label={`PDF page ${pageNumber}`}
      />
    </div>
  )
}
