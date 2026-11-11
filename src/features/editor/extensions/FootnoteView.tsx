import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { cn } from '#/lib/utils'

/** Footnote mark; the number comes from a CSS counter in document order (see styles.css). */
export function FootnoteView({ node, selected }: NodeViewProps) {
  const text = String(node.attrs.text ?? '')
  return (
    <NodeViewWrapper
      as="span"
      className={cn('footnote-ref cursor-pointer rounded px-px text-sky-700', selected && 'ring-2 ring-ring', !text && 'text-red-700')}
      title={text || 'Nota de rodapé vazia: selecione para escrever'}
    />
  )
}
