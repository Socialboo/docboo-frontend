import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Toolbar } from './Toolbar'
import { editorExtensions } from './extensions'
import type { Editor } from '@tiptap/react'
import type { ContentRef } from '#/document-model/types'
import { Input } from '#/components/ui/input'
import { attachmentLetter, findSection, getBlocks, setBlocks, updateAttachment, updateSection } from '#/document-model/sections'
import { blocksToTiptap, tiptapToBlocks } from '#/document-model/tiptap'
import { useWork } from '#/features/work/WorkProvider'

/**
 * Edits one section (or appendix/annex). The editor is created from the model when the section is
 * opened and writes every change back to the model; it is remounted (key) when another section is
 * selected.
 */
export function SectionEditor({ target, onEditor }: { target: ContentRef; onEditor: (editor: Editor | null) => void }) {
  const { doc, update, workId } = useWork()

  const editor = useEditor({
    extensions: editorExtensions(),
    content: blocksToTiptap(getBlocks(doc, target) ?? []),
    immediatelyRender: true,
    editorProps: { attributes: { class: 'docboo-editor', 'aria-label': 'Texto da seção' } },
    onUpdate: ({ editor: e }) => {
      const blocks = tiptapToBlocks(e.getJSON())
      update((d) => setBlocks(d, target, blocks))
    },
  })

  useEffect(() => {
    onEditor(editor)
    return () => onEditor(null)
  }, [editor, onEditor])

  const heading = headingOf(target)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="shrink-0 font-mono text-sm text-muted-foreground">{heading.prefix}</span>
        <Input
          aria-label="Título da seção"
          className="h-9 border-none text-lg font-semibold shadow-none focus-visible:ring-0"
          value={heading.title}
          maxLength={500}
          placeholder="Título"
          onChange={(e) => {
            const title = e.target.value
            update((d) =>
              target.kind === 'section'
                ? updateSection(d, target.id, (s) => ({ ...s, title }))
                : updateAttachment(d, target.kind, target.id, (a) => ({ ...a, title })),
            )
          }}
        />
      </div>
      <Toolbar editor={editor} workId={workId} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="mx-auto max-w-[21cm] px-[2cm] py-8" />
      </div>
    </div>
  )

  function headingOf(ref: ContentRef): { prefix: string; title: string } {
    if (ref.kind === 'section') {
      const loc = findSection(doc, ref.id)
      return { prefix: loc?.number ?? '', title: loc?.section.title ?? '' }
    }
    const list = ref.kind === 'appendix' ? doc.postTextual.appendices : doc.postTextual.annexes
    const index = list.findIndex((a) => a.id === ref.id)
    return {
      prefix: `${ref.kind === 'appendix' ? 'APÊNDICE' : 'ANEXO'} ${attachmentLetter(index)} –`,
      title: list[index]?.title ?? '',
    }
  }
}
