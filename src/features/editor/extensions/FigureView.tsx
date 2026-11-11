import { NodeViewWrapper } from '@tiptap/react'
import { ImageOff } from 'lucide-react'
import type { NodeViewProps } from '@tiptap/react'
import { cn } from '#/lib/utils'

/** Figure as shown in the editor: caption above, image, source below (like the export). */
export function FigureView({ node, selected }: NodeViewProps) {
  const { assetId, caption, source, widthPercent } = node.attrs as {
    assetId: string
    caption: string
    source: string
    widthPercent: number
  }

  return (
    <NodeViewWrapper
      as="figure"
      data-drag-handle
      className={cn('my-4 rounded-md p-2 text-center', selected && 'ring-2 ring-ring')}
    >
      <figcaption className="mb-1 text-sm">
        <span className="font-medium">Figura</span> – {caption || <em className="text-muted-foreground">sem legenda</em>}
      </figcaption>
      {assetId ? (
        <img
          src={`/api/assets/${assetId}`}
          alt={caption}
          className="mx-auto"
          style={{ width: `${widthPercent}%` }}
          draggable={false}
        />
      ) : (
        <div className="mx-auto flex h-24 items-center justify-center gap-2 rounded border border-dashed text-sm text-muted-foreground">
          <ImageOff className="size-4" /> Sem imagem
        </div>
      )}
      <p className="mt-1 text-left text-sm">
        Fonte: {source || <em className="text-muted-foreground">informe a fonte</em>}
      </p>
    </NodeViewWrapper>
  )
}
