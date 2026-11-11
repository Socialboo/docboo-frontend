import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import type { CitationMode } from '#/document-model/types'
import { formatCitation } from '#/document-model/citations'
import { useWork } from '#/features/work/WorkProvider'
import { cn } from '#/lib/utils'

/** Citation rendered with the author-date label of the current references. */
export function CitationView({ node, selected }: NodeViewProps) {
  const { doc } = useWork()
  const attrs = node.attrs as { refIds: Array<string>; locator: string; mode: CitationMode }
  const label = formatCitation({ refIds: attrs.refIds, locator: attrs.locator || null, mode: attrs.mode }, doc.references)
  const broken = attrs.refIds.some((id) => !doc.references.some((r) => r.id === id))

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'rounded bg-sky-100 px-0.5 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
        broken && 'bg-red-100 text-red-900',
        selected && 'ring-2 ring-ring',
      )}
      title={broken ? 'Referência removida' : 'Citação: selecione para editar'}
    >
      {label}
    </NodeViewWrapper>
  )
}
