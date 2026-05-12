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
  const [instance, updateInstance] = usePDF({ document })
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageNumbers, setPageNumbers] = useState<number[]>([])
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    updateInstance(document)
  }, [document, updateInstance])

  useEffect(() => {
    if (!instance.blob) return

    let cancelled = false
    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null

    const loadDocument = async () => {
      try {
        setRenderError(null)
        const data = new Uint8Array(await instance.blob!.arrayBuffer())
        loadingTask = pdfjs.getDocument({ data })
        const loadedPdf = await loadingTask.promise

        if (cancelled) {
          await loadedPdf.destroy()
          return
        }

        setPdfDocument((previousPdf) => {
          void previousPdf?.destroy()
          return loadedPdf
        })
        setPageNumbers(
          Array.from({ length: loadedPdf.numPages }, (_, index) => index + 1)
        )
      } catch (error) {
        if (!cancelled) {
          setRenderError(String(error))
          setPdfDocument(null)
          setPageNumbers([])
        }
      }
    }

    void loadDocument()

    return () => {
      cancelled = true
      void loadingTask?.destroy()
    }
  }, [instance.blob])

  useEffect(() => {
    return () => {
      void pdfDocument?.destroy()
    }
  }, [pdfDocument])

  const error = instance.error ? String(instance.error) : renderError

  return (
    <div
      className={`min-h-[700px] bg-zinc-900 p-4 sm:p-8 ${className ?? ''}`}
    >
      {instance.loading && (
        <div className="flex min-h-[620px] items-center justify-center text-sm text-zinc-300">
          Připravuji náhled PDF...
        </div>
      )}

      {error && (
        <div className="flex min-h-[620px] items-center justify-center px-4 text-center text-sm text-red-200">
          Náhled PDF se nepodařilo vykreslit: {error}
        </div>
      )}

      {!instance.loading && !error && pdfDocument && (
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

    pdfDocument.getPage(pageNumber).then((loadedPage) => {
      if (!cancelled) {
        setPage(loadedPage)
      }
    })

    return () => {
      cancelled = true
      setPage(null)
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
