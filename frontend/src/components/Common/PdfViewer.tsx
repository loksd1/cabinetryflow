import { Minus, Plus } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface PdfViewerProps {
  fileUrl: string
}

export function PdfViewer({ fileUrl }: PdfViewerProps) {
  const { t } = useTranslation()
  const scrollPositionRef = useRef<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [scale, setScale] = useState(1)

  const previewUrl = useMemo(() => {
    const zoomPercent = Math.round(scale * 100)
    return `${fileUrl}#toolbar=0&navpanes=0&page=${pageNumber}&zoom=${zoomPercent}`
  }, [fileUrl, pageNumber, scale])

  const preserveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY
    requestAnimationFrame(() => {
      if (scrollPositionRef.current !== null) {
        window.scrollTo({ top: scrollPositionRef.current, behavior: "instant" as ScrollBehavior })
      }
    })
  }

  const updatePage = (updater: (current: number) => number) => {
    preserveScrollPosition()
    setPageNumber((current) => {
      const next = updater(current)
      if (pageCount) {
        return Math.min(Math.max(next, 1), pageCount)
      }
      return Math.max(next, 1)
    })
  }

  const updateScale = (updater: (current: number) => number) => {
    preserveScrollPosition()
    setScale((current) => Math.min(2.5, Math.max(0.75, updater(current))))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {t("pdfViewer.previewTechnicalDrawing")}
          {pageCount
            ? ` • ${t("pdfViewer.pageIndicatorWithTotal", {
                page: pageNumber,
                total: pageCount,
              })}`
            : ` • ${t("pdfViewer.pageIndicator", { page: pageNumber })}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => updatePage((current) => current - 1)}
            disabled={pageNumber <= 1}
          >
            {t("common.previous")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => updatePage((current) => current + 1)}
            disabled={pageCount !== null && pageNumber >= pageCount}
          >
            {t("common.next")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => updateScale((current) => current - 0.1)}
          >
            <Minus className="size-3.5" />
            {t("pdfViewer.zoomOut")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => updateScale((current) => current + 0.1)}
          >
            <Plus className="size-3.5" />
            {t("pdfViewer.zoomIn")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              preserveScrollPosition()
              setPageNumber(1)
              setScale(1)
            }}
          >
            {t("common.reset")}
          </Button>
          <Button asChild type="button" size="sm" variant="outline" className="h-7 px-2 text-xs">
            <a href={fileUrl} target="_blank" rel="noreferrer">
              {t("pdfViewer.openFullPdf")}
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white p-3">
        <iframe
          src={previewUrl}
          title={t("pdfViewer.technicalDrawingPreview")}
          className="h-[60svh] min-h-[24rem] w-full"
          onLoad={(event) => {
            const frameWindow = event.currentTarget.contentWindow
            const pagesFromPlugin = frameWindow?.document?.querySelector?.("#numPages")
            const pageCountText = pagesFromPlugin?.textContent?.trim()
            const parsed = pageCountText ? Number(pageCountText) : Number.NaN
            if (Number.isFinite(parsed) && parsed > 0) {
              setPageCount(parsed)
            }
          }}
        />
      </div>
    </div>
  )
}