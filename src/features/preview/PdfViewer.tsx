import { useEffect, useRef, useState } from 'react'

/**
 * Renders every page of a PDF with pdf.js (loaded on demand, so the editor bundle stays small).
 */
export function PdfViewer({ data }: { data: ArrayBuffer }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Read through a function: the flag changes while pages are awaited.
    const isCancelled = () => cancelled
    const container = containerRef.current
    if (!container) return

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise
        if (isCancelled()) return
        setPages(pdf.numPages)
        container.replaceChildren()
        for (let n = 1; n <= pdf.numPages && !isCancelled(); n++) {
          const page = await pdf.getPage(n)
          const viewport = page.getViewport({ scale: 1.4 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'mx-auto mb-4 w-full max-w-[21cm] bg-white shadow'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `Página ${n} de ${pdf.numPages}`)
          container.appendChild(canvas)
          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
        }
      } catch (e) {
        if (!isCancelled()) setError((e as Error).message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data])

  return (
    <div>
      {pages !== null && <p className="mb-2 text-center text-xs text-muted-foreground">{pages} página(s)</p>}
      {error && <p className="text-sm text-destructive">Não foi possível exibir o PDF: {error}</p>}
      <div ref={containerRef} data-testid="pdf-pages" />
    </div>
  )
}
