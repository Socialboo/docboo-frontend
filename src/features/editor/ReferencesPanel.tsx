import { useState } from 'react'
import { FileUp, Pencil, Plus, Quote, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Editor } from '@tiptap/react'
import type { CslItem, DocumentModel, Inline } from '#/document-model/types'
import { Field } from '#/components/forms/Field'
import { NativeSelect } from '#/components/forms/NativeSelect'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { parseBibtex, parseNames } from '#/document-model/bibtex'
import { authorLabel, referenceSummary, yearOf } from '#/document-model/citations'
import { newId } from '#/document-model/ids'
import { walkSections } from '#/document-model/sections'
import { useWork } from '#/features/work/WorkProvider'

const TYPES: ReadonlyArray<[string, string]> = [
  ['book', 'Livro'],
  ['chapter', 'Capítulo de livro'],
  ['article-journal', 'Artigo de periódico'],
  ['thesis', 'Tese, dissertação ou TCC'],
  ['webpage', 'Página da internet'],
  ['paper-conference', 'Trabalho em evento'],
  ['report', 'Relatório'],
]

/** References of the work (CSL-JSON): add, edit, import BibTeX and cite in the text. */
export function ReferencesPanel({ editor }: { editor: Editor | null }) {
  const { doc, update } = useWork()
  const [editing, setEditing] = useState<CslItem | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const cited = citedIds(doc)
  const sorted = [...doc.references].sort((a, b) => authorLabel(a, true).localeCompare(authorLabel(b, true), 'pt-BR'))

  const cite = (id: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: 'citation', attrs: { refIds: [id], locator: '', mode: 'parenthetical' } }).run()
  }

  return (
    <section className="grid gap-2 px-4 py-3" aria-label="Referências">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referências ({doc.references.length})</h3>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon-xs" aria-label="Importar BibTeX" title="Importar BibTeX" onClick={() => setImporting(true)}>
            <FileUp />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Adicionar referência" title="Adicionar referência" onClick={() => setEditing('new')}>
            <Plus />
          </Button>
        </div>
      </div>

      {sorted.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma referência. Adicione ou importe um BibTeX.</p>}
      <ul className="grid gap-1.5">
        {sorted.map((r) => (
          <li key={r.id} className="group rounded-md border p-2 text-xs">
            <p className="line-clamp-3">{referenceSummary(r)}</p>
            <div className="mt-1 flex items-center gap-1">
              <Button
                size="xs"
                variant="secondary"
                disabled={!editor}
                // Keep the focus (and cursor) in the editor so the user can keep typing after the citation.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => cite(r.id)}
              >
                <Quote /> Citar
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Editar referência" onClick={() => setEditing(r)}>
                <Pencil />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Excluir referência"
                onClick={() => {
                  if (cited.has(r.id)) {
                    toast.error('Esta referência é citada no texto. Remova as citações antes de excluí-la.')
                    return
                  }
                  update((d) => ({ ...d, references: d.references.filter((x) => x.id !== r.id) }))
                }}
              >
                <Trash2 />
              </Button>
              {!cited.has(r.id) && <span className="ml-auto text-[10px] text-muted-foreground">não citada</span>}
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <ReferenceDialog
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(item) => {
            update((d) => ({
              ...d,
              references: d.references.some((x) => x.id === item.id)
                ? d.references.map((x) => (x.id === item.id ? item : x))
                : [...d.references, item],
            }))
            setEditing(null)
          }}
        />
      )}
      {importing && (
        <BibtexDialog
          existingIds={doc.references.map((r) => r.id)}
          onClose={() => setImporting(false)}
          onImport={(items) => {
            update((d) => ({ ...d, references: [...d.references, ...items] }))
            setImporting(false)
            toast.success(`${items.length} referência(s) importada(s).`)
          }}
        />
      )}
    </section>
  )
}

function citedIds(doc: DocumentModel): Set<string> {
  const ids = new Set<string>()
  const scan = (inlines: Array<Inline>) => {
    for (const i of inlines) {
      if (i.type === 'citation') i.refIds.forEach((id) => ids.add(id))
      if (i.type === 'footnote') scan(i.content)
    }
  }
  const blocks = [
    ...doc.postTextual.appendices.flatMap((a) => a.blocks),
    ...doc.postTextual.annexes.flatMap((a) => a.blocks),
  ]
  walkSections(doc.textual.sections, ({ section }) => blocks.push(...section.blocks))
  for (const b of blocks) {
    if (b.type === 'paragraph' || b.type === 'longQuote') scan(b.content)
    else if (b.type === 'list') b.items.forEach((it) => scan(it.content))
    else if (b.type === 'table') b.rows.forEach((r) => r.cells.forEach((c) => scan(c.content)))
    else scan([...b.caption, ...b.source])
  }
  return ids
}

interface RefForm {
  type: string
  authors: string
  title: string
  container: string
  editors: string
  publisher: string
  place: string
  year: string
  edition: string
  volume: string
  issue: string
  pages: string
  genre: string
  url: string
  accessed: string
  doi: string
}

function toForm(item: CslItem | null): RefForm {
  const names = (list: CslItem['author']) =>
    (list ?? []).map((n) => n.literal ?? [n.family, n.given].filter(Boolean).join(', ')).join('\n')
  const accessed = item?.accessed?.['date-parts']?.[0]
  return {
    type: item?.type ?? 'book',
    authors: names(item?.author),
    title: item?.title ?? '',
    container: item?.['container-title'] ?? '',
    editors: names(item?.editor),
    publisher: item?.publisher ?? '',
    place: item?.['publisher-place'] ?? '',
    year: item ? (yearOf(item) === '[s. d.]' ? '' : yearOf(item)) : '',
    edition: item?.edition ?? '',
    volume: item?.volume ?? '',
    issue: item?.issue ?? '',
    pages: item?.page ?? '',
    genre: item?.genre ?? '',
    url: item?.URL ?? '',
    accessed: accessed?.length === 3 ? `${accessed[0]}-${String(accessed[1]).padStart(2, '0')}-${String(accessed[2]).padStart(2, '0')}` : '',
    doi: item?.DOI ?? '',
  }
}

function fromForm(f: RefForm, base: CslItem | null): CslItem {
  const names = (text: string) => {
    const list = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .flatMap((l) => (l.includes(',') ? parseNames(l) : [{ family: null, given: null, literal: l }]))
    return list.length > 0 ? list : null
  }
  const or = (v: string) => (v.trim() ? v.trim() : null)
  const year = Number.parseInt(f.year, 10)
  const accessed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.accessed)
  return {
    ...(base ?? {}),
    id: base?.id ?? newId('ref'),
    type: f.type,
    title: f.title.trim(),
    author: names(f.authors),
    editor: names(f.editors),
    'container-title': or(f.container),
    publisher: or(f.publisher),
    'publisher-place': or(f.place),
    issued: Number.isFinite(year) ? { 'date-parts': [[year]], literal: null } : null,
    accessed: accessed ? { 'date-parts': [[+accessed[1], +accessed[2], +accessed[3]]], literal: null } : null,
    edition: or(f.edition),
    volume: or(f.volume),
    issue: or(f.issue),
    page: or(f.pages),
    genre: or(f.genre),
    number: base?.number ?? null,
    URL: or(f.url),
    DOI: or(f.doi),
    ISBN: base?.ISBN ?? null,
    ISSN: base?.ISSN ?? null,
  }
}

function ReferenceDialog({ initial, onClose, onSave }: { initial: CslItem | null; onClose: () => void; onSave: (item: CslItem) => void }) {
  const [form, setForm] = useState(() => toForm(initial))
  const set = (key: keyof RefForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const t = form.type
  const isPart = t === 'chapter' || t === 'paper-conference'
  const isArticle = t === 'article-journal'

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.title.trim()) return
            onSave(fromForm(form, initial))
          }}
        >
          <DialogHeader>
            <DialogTitle>{initial ? 'Editar referência' : 'Nova referência'}</DialogTitle>
          </DialogHeader>
          <Field id="ref-type" label="Tipo">
            <NativeSelect id="ref-type" value={form.type} onChange={set('type')}>
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="ref-authors" label="Autores" hint='Um por linha: "Sobrenome, Nome". Instituições: o nome completo, sem vírgula.'>
            <Textarea id="ref-authors" rows={3} value={form.authors} onChange={set('authors')} />
          </Field>
          <Field id="ref-title" label="Título" required hint='Subtítulo após ": ".'>
            <Input id="ref-title" value={form.title} onChange={set('title')} required />
          </Field>
          {(isPart || isArticle) && (
            <Field id="ref-container" label={isArticle ? 'Periódico' : 'Título do livro / evento'}>
              <Input id="ref-container" value={form.container} onChange={set('container')} />
            </Field>
          )}
          {isPart && (
            <Field id="ref-editors" label="Organizadores / editores" hint="Um por linha.">
              <Textarea id="ref-editors" rows={2} value={form.editors} onChange={set('editors')} />
            </Field>
          )}
          {t === 'thesis' && (
            <Field id="ref-genre" label="Tipo de trabalho" hint="Ex.: Dissertação (Mestrado em Computação)">
              <Input id="ref-genre" value={form.genre} onChange={set('genre')} />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ref-publisher" label={t === 'thesis' ? 'Instituição' : 'Editora'}>
              <Input id="ref-publisher" value={form.publisher} onChange={set('publisher')} />
            </Field>
            <Field id="ref-place" label="Local">
              <Input id="ref-place" value={form.place} onChange={set('place')} />
            </Field>
            <Field id="ref-year" label="Ano">
              <Input id="ref-year" inputMode="numeric" value={form.year} onChange={set('year')} />
            </Field>
            {!isArticle && (
              <Field id="ref-edition" label="Edição">
                <Input id="ref-edition" value={form.edition} onChange={set('edition')} />
              </Field>
            )}
            {isArticle && (
              <>
                <Field id="ref-volume" label="Volume">
                  <Input id="ref-volume" value={form.volume} onChange={set('volume')} />
                </Field>
                <Field id="ref-issue" label="Número">
                  <Input id="ref-issue" value={form.issue} onChange={set('issue')} />
                </Field>
              </>
            )}
            {(isArticle || isPart) && (
              <Field id="ref-pages" label="Páginas" hint="Ex.: 10-25">
                <Input id="ref-pages" value={form.pages} onChange={set('pages')} />
              </Field>
            )}
          </div>
          <Field id="ref-url" label="URL">
            <Input id="ref-url" type="url" value={form.url} onChange={set('url')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ref-accessed" label="Acesso em">
              <Input id="ref-accessed" type="date" value={form.accessed} onChange={set('accessed')} />
            </Field>
            <Field id="ref-doi" label="DOI">
              <Input id="ref-doi" value={form.doi} onChange={set('doi')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BibtexDialog({
  existingIds,
  onClose,
  onImport,
}: {
  existingIds: Array<string>
  onClose: () => void
  onImport: (items: Array<CslItem>) => void
}) {
  const [text, setText] = useState('')
  const result = text.trim() ? parseBibtex(text, existingIds) : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar BibTeX</DialogTitle>
          <DialogDescription>Cole as entradas ou escolha um arquivo .bib.</DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="Conteúdo BibTeX"
          rows={10}
          className="font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'@book{silva2020,\n  author = {Silva, João},\n  title = {Título},\n  year = {2020}\n}'}
        />
        <Input
          type="file"
          accept=".bib,text/plain"
          aria-label="Arquivo .bib"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) setText(await file.text())
          }}
        />
        {result && (
          <div className="text-xs">
            <p>{result.items.length} referência(s) reconhecida(s).</p>
            {result.errors.map((err) => (
              <p key={err} className="text-destructive">
                {err}
              </p>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button disabled={!result || result.items.length === 0} onClick={() => result && onImport(result.items)}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
