import { useRef } from 'react'
import { NodeSelection } from '@tiptap/pm/state'
import { useEditorState } from '@tiptap/react'
import { toast } from 'sonner'
import { uploadImage } from './uploadImage'
import type { Editor } from '@tiptap/react'
import type { CitationMode } from '#/document-model/types'
import { Field } from '#/components/forms/Field'
import { NativeSelect } from '#/components/forms/NativeSelect'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { formatCitation, referenceSummary } from '#/document-model/citations'
import { useWork } from '#/features/work/WorkProvider'

type Selected =
  | { kind: 'figure'; attrs: { assetId: string; caption: string; source: string; widthPercent: number } }
  | { kind: 'citation'; attrs: { refIds: Array<string>; locator: string; mode: CitationMode } }
  | { kind: 'footnote'; attrs: { text: string } }
  | { kind: 'table'; attrs: { title: string; source: string } }
  | { kind: 'none' }

/** Editable properties of the selected figure, table, citation or footnote. */
export function PropertiesPanel({ editor }: { editor: Editor }) {
  const selected = useEditorState({
    editor,
    selector: ({ editor: e }): Selected => {
      const { selection } = e.state
      if (selection instanceof NodeSelection) {
        const name = selection.node.type.name
        if (name === 'figure' || name === 'citation' || name === 'footnote') {
          return { kind: name, attrs: selection.node.attrs } as Selected
        }
      }
      if (e.isActive('table')) return { kind: 'table', attrs: e.getAttributes('table') as { title: string; source: string } }
      return { kind: 'none' }
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })

  // Updates the selected node (or the table around the cursor) without stealing focus from the panel.
  const set = (type: string, attrs: Record<string, unknown>) => editor.chain().updateAttributes(type, attrs).run()

  switch (selected.kind) {
    case 'figure':
      return <FigureProperties editor={editor} attrs={selected.attrs} set={(a) => set('figure', a)} />
    case 'citation':
      return <CitationProperties editor={editor} attrs={selected.attrs} set={(a) => set('citation', a)} />
    case 'footnote':
      return (
        <Panel title="Nota de rodapé">
          <Field id="fn-text" label="Texto da nota">
            <Textarea
              id="fn-text"
              autoFocus={!selected.attrs.text}
              rows={4}
              value={selected.attrs.text}
              onChange={(e) => set('footnote', { text: e.target.value })}
            />
          </Field>
          <RemoveButton label="Remover nota" onClick={() => editor.chain().focus().deleteSelection().run()} />
        </Panel>
      )
    case 'table':
      return (
        <Panel title="Tabela">
          <Field id="tb-title" label="Título" hint='Exportado acima: "Tabela N – título".'>
            <Input id="tb-title" value={selected.attrs.title} onChange={(e) => set('table', { title: e.target.value })} />
          </Field>
          <Field id="tb-source" label="Fonte" hint='Exportada abaixo: "Fonte: ...".'>
            <Input id="tb-source" value={selected.attrs.source} onChange={(e) => set('table', { source: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Linha</Button>
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Coluna</Button>
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().deleteRow().run()}>− Linha</Button>
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().deleteColumn().run()}>− Coluna</Button>
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().mergeOrSplit().run()}>Mesclar/dividir</Button>
            <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Cabeçalho</Button>
          </div>
          <RemoveButton label="Excluir tabela" onClick={() => editor.chain().focus().deleteTable().run()} />
        </Panel>
      )
    default:
      return (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Selecione uma figura, tabela, citação ou nota de rodapé para editar as propriedades.
        </p>
      )
  }
}

function FigureProperties({
  editor,
  attrs,
  set,
}: {
  editor: Editor
  attrs: { assetId: string; caption: string; source: string; widthPercent: number }
  set: (a: Record<string, unknown>) => void
}) {
  const { workId } = useWork()
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Panel title="Figura">
      <Field id="fig-caption" label="Legenda" hint='Exportada acima: "Figura N – legenda".'>
        <Input id="fig-caption" autoFocus={!attrs.caption} value={attrs.caption} onChange={(e) => set({ caption: e.target.value })} />
      </Field>
      <Field id="fig-source" label="Fonte" hint="Ex.: Elaborado pelo autor (2026).">
        <Input id="fig-source" value={attrs.source} onChange={(e) => set({ source: e.target.value })} />
      </Field>
      <Field id="fig-width" label={`Largura: ${attrs.widthPercent}% da área de texto`}>
        <input
          id="fig-width"
          type="range"
          min={10}
          max={100}
          step={5}
          value={attrs.widthPercent}
          onChange={(e) => set({ widthPercent: Number(e.target.value) })}
        />
      </Field>
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        Trocar imagem
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            const asset = await uploadImage(workId, file)
            set({ assetId: asset.id })
          } catch (err) {
            toast.error((err as Error).message)
          }
        }}
      />
      <RemoveButton label="Remover figura" onClick={() => editor.chain().focus().deleteSelection().run()} />
    </Panel>
  )
}

function CitationProperties({
  editor,
  attrs,
  set,
}: {
  editor: Editor
  attrs: { refIds: Array<string>; locator: string; mode: CitationMode }
  set: (a: Record<string, unknown>) => void
}) {
  const { doc } = useWork()
  return (
    <Panel title="Citação">
      <p className="rounded bg-muted px-2 py-1.5 text-sm">
        {formatCitation({ refIds: attrs.refIds, locator: attrs.locator || null, mode: attrs.mode }, doc.references)}
      </p>
      <Field id="cit-mode" label="Forma">
        <NativeSelect id="cit-mode" value={attrs.mode} onChange={(e) => set({ mode: e.target.value })}>
          <option value="parenthetical">Entre parênteses: (SILVA, 2020)</option>
          <option value="narrative">No texto: Silva (2020)</option>
        </NativeSelect>
      </Field>
      <Field id="cit-locator" label="Página ou localização" hint="Ex.: p. 12">
        <Input id="cit-locator" value={attrs.locator} onChange={(e) => set({ locator: e.target.value })} />
      </Field>
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm font-medium">Referências citadas</legend>
        {doc.references.map((r) => (
          <label key={r.id} className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={attrs.refIds.includes(r.id)}
              onChange={(e) => {
                const refIds = e.target.checked ? [...attrs.refIds, r.id] : attrs.refIds.filter((id) => id !== r.id)
                if (refIds.length > 0) set({ refIds })
              }}
            />
            <span className="line-clamp-2">{referenceSummary(r)}</span>
          </label>
        ))}
      </fieldset>
      <RemoveButton label="Remover citação" onClick={() => editor.chain().focus().deleteSelection().run()} />
    </Panel>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 px-4 py-3" aria-label={`Propriedades: ${title}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" className="w-fit text-destructive" onClick={onClick}>
      {label}
    </Button>
  )
}
