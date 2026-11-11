import { ArrowDown, ArrowUp, CornerDownRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { ContentRef, Section } from '#/document-model/types'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  MAX_DEPTH,
  addAttachment,
  addSection,
  attachmentLetter,
  moveAttachment,
  moveSection,
  newSection,
  removeAttachment,
  removeSection,
} from '#/document-model/sections'
import { useWork } from '#/features/work/WorkProvider'
import { cn } from '#/lib/utils'

/** Chapters/sections (numbered, up to 5 levels), appendices and annexes. */
export function SectionTree({ selected, onSelect }: { selected: ContentRef; onSelect: (ref: ContentRef) => void }) {
  const { doc, update } = useWork()
  const sectionCount = countSections(doc.textual.sections)

  const add = (position: { afterId?: string; parentId?: string }) => {
    const section = newSection('Nova seção')
    update((d) => addSection(d, section, position))
    onSelect({ kind: 'section', id: section.id })
  }

  const renderSections = (sections: Array<Section>, prefix: string, depth: number): ReactNode =>
    sections.map((s, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      const isSelected = selected.kind === 'section' && selected.id === s.id
      return (
        <li key={s.id}>
          <TreeItem
            label={`${number} ${s.title || 'Sem título'}`}
            depth={depth}
            selected={isSelected}
            onSelect={() => onSelect({ kind: 'section', id: s.id })}
          >
            <DropdownMenuItem onClick={() => add({ afterId: s.id })}>
              <Plus /> Seção depois desta
            </DropdownMenuItem>
            <DropdownMenuItem disabled={depth >= MAX_DEPTH} onClick={() => add({ parentId: s.id })}>
              <CornerDownRight /> Subseção
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={i === 0} onClick={() => update((d) => moveSection(d, s.id, -1))}>
              <ArrowUp /> Mover para cima
            </DropdownMenuItem>
            <DropdownMenuItem disabled={i === sections.length - 1} onClick={() => update((d) => moveSection(d, s.id, 1))}>
              <ArrowDown /> Mover para baixo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={sectionCount <= 1}
              onClick={() => {
                if (!window.confirm(`Excluir "${s.title}" e todo o seu conteúdo?`)) return
                update((d) => removeSection(d, s.id))
                if (isSelected) onSelect({ kind: 'section', id: doc.textual.sections[0].id })
              }}
            >
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </TreeItem>
          {s.children.length > 0 && <ul>{renderSections(s.children, number, depth + 1)}</ul>}
        </li>
      )
    })

  const attachments = (kind: 'appendix' | 'annex') => {
    const list = kind === 'appendix' ? doc.postTextual.appendices : doc.postTextual.annexes
    const label = kind === 'appendix' ? 'APÊNDICE' : 'ANEXO'
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {kind === 'appendix' ? 'Apêndices' : 'Anexos'}
          </h3>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={kind === 'appendix' ? 'Adicionar apêndice' : 'Adicionar anexo'}
            onClick={() => {
              let id = ''
              update((d) => {
                const [next, newId] = addAttachment(d, kind, kind === 'appendix' ? 'Novo apêndice' : 'Novo anexo')
                id = newId
                return next
              })
              onSelect({ kind, id })
            }}
          >
            <Plus />
          </Button>
        </div>
        <ul>
          {list.map((a, i) => (
            <li key={a.id}>
              <TreeItem
                label={`${label} ${attachmentLetter(i)} – ${a.title || 'Sem título'}`}
                depth={1}
                selected={selected.kind === kind && selected.id === a.id}
                onSelect={() => onSelect({ kind, id: a.id })}
              >
                <DropdownMenuItem disabled={i === 0} onClick={() => update((d) => moveAttachment(d, kind, a.id, -1))}>
                  <ArrowUp /> Mover para cima
                </DropdownMenuItem>
                <DropdownMenuItem disabled={i === list.length - 1} onClick={() => update((d) => moveAttachment(d, kind, a.id, 1))}>
                  <ArrowDown /> Mover para baixo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm(`Excluir "${a.title}"?`)) return
                    update((d) => removeAttachment(d, kind, a.id))
                    if (selected.id === a.id) onSelect({ kind: 'section', id: doc.textual.sections[0].id })
                  }}
                >
                  <Trash2 /> Excluir
                </DropdownMenuItem>
              </TreeItem>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <nav aria-label="Estrutura do trabalho" className="text-sm">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seções</h3>
        <Button variant="ghost" size="icon-xs" aria-label="Adicionar capítulo" onClick={() => add({})}>
          <Plus />
        </Button>
      </div>
      <ul>{renderSections(doc.textual.sections, '', 1)}</ul>
      {attachments('appendix')}
      {attachments('annex')}
    </nav>
  )
}

function TreeItem({
  label,
  depth,
  selected,
  onSelect,
  children,
}: {
  label: string
  depth: number
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <div className={cn('group flex items-center rounded-md hover:bg-muted', selected && 'bg-muted font-medium')}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className="min-w-0 flex-1 truncate py-1.5 pr-1 text-left"
        style={{ paddingLeft: `${0.5 + (depth - 1) * 0.875}rem` }}
        title={label}
      >
        {label}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-xs" className="opacity-60 group-hover:opacity-100" aria-label={`Ações de ${label}`} />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{children}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function countSections(sections: Array<Section>): number {
  return sections.reduce((n, s) => n + 1 + countSections(s.children), 0)
}
