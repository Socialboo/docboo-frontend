import { useCallback, useState } from 'react'
import { PropertiesPanel } from './PropertiesPanel'
import { ReferencesPanel } from './ReferencesPanel'
import { SectionEditor } from './SectionEditor'
import { SectionTree } from './SectionTree'
import type { Editor } from '@tiptap/react'
import type { ContentRef } from '#/document-model/types'
import { Separator } from '#/components/ui/separator'
import { getBlocks } from '#/document-model/sections'
import { useWork } from '#/features/work/WorkProvider'

/** Section tree (left), editor of the selected section (center), properties and references (right). */
export function EditorPage() {
  const { doc } = useWork()
  const [selected, setSelected] = useState<ContentRef>(() => ({ kind: 'section', id: doc.textual.sections[0].id }))
  const [editor, setEditor] = useState<Editor | null>(null)
  const onEditor = useCallback((e: Editor | null) => setEditor(e), [])

  // The selected unit may have been removed (tree actions): fall back to the first section.
  const target: ContentRef = getBlocks(doc, selected) ? selected : { kind: 'section', id: doc.textual.sections[0].id }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-[260px_1fr_320px]">
      <aside className="overflow-y-auto border-r p-2">
        <SectionTree selected={target} onSelect={setSelected} />
      </aside>
      <SectionEditor key={`${target.kind}:${target.id}`} target={target} onEditor={onEditor} />
      <aside className="overflow-y-auto border-l">
        {editor && <PropertiesPanel editor={editor} />}
        <Separator />
        <ReferencesPanel editor={editor} />
      </aside>
    </div>
  )
}
