import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Block, CslItem, DocumentModel, Inline, Section } from '#/document-model/types'
import { formatCitation, yearOf } from '#/document-model/citations'
import { attachmentLetter } from '#/document-model/sections'

/**
 * Approximate HTML rendering of the work in ABNT layout (A4 width, margins, fonts, numbering).
 * Not paginated: page breaks, page numbers and the table of contents' page numbers only exist in the
 * real PDF ("Gerar PDF real").
 */
export function DocumentPreview({ doc }: { doc: DocumentModel }) {
  const m = doc.metadata
  const p = doc.preTextual
  const font = doc.profileOverrides.fontFamily === 'arial' ? 'Arial, "Liberation Sans", sans-serif' : '"Times New Roman", "Liberation Serif", serif'
  const footnotes: Array<Inline> = []
  let figureNo = 0
  let tableNo = 0

  const inlines = (list: Array<Inline>): ReactNode =>
    list.map((i, k) => {
      switch (i.type) {
        case 'text': {
          let node: ReactNode = i.text
          if (i.marks.includes('bold')) node = <strong>{node}</strong>
          if (i.marks.includes('italic')) node = <em>{node}</em>
          if (i.marks.includes('underline')) node = <u>{node}</u>
          if (i.marks.includes('superscript')) node = <sup>{node}</sup>
          if (i.marks.includes('subscript')) node = <sub>{node}</sub>
          return <Fragment key={k}>{node}</Fragment>
        }
        case 'hardBreak':
          return <br key={k} />
        case 'citation':
          return <Fragment key={k}>{formatCitation(i, doc.references)}</Fragment>
        case 'footnote':
          footnotes.push(i)
          return <sup key={k}>{footnotes.length}</sup>
      }
    })

  const blocks = (list: Array<Block>): ReactNode =>
    list.map((b) => {
      switch (b.type) {
        case 'paragraph':
          return <p key={b.id} className="abnt-p">{inlines(b.content)}</p>
        case 'longQuote':
          return <blockquote key={b.id} className="abnt-quote">{inlines(b.content)}</blockquote>
        case 'list': {
          const Tag = b.ordered ? 'ol' : 'ul'
          return (
            <Tag key={b.id} className={b.ordered ? 'abnt-ol' : 'abnt-ul'}>
              {b.items.map((it, k) => <li key={k}>{inlines(it.content)}</li>)}
            </Tag>
          )
        }
        case 'figure':
          figureNo++
          return (
            <figure key={b.id} className="abnt-figure">
              <figcaption className="abnt-caption">Figura {figureNo} – {inlines(b.caption)}</figcaption>
              {b.assetId && <img src={`/api/assets/${b.assetId}`} alt="" style={{ width: `${b.widthPercent}%` }} />}
              {b.source.length > 0 && <p className="abnt-source">Fonte: {inlines(b.source)}</p>}
            </figure>
          )
        case 'table':
          tableNo++
          return (
            <div key={b.id} className="abnt-figure">
              <p className="abnt-caption">Tabela {tableNo} – {inlines(b.title)}</p>
              <table className="abnt-table">
                <tbody>
                  {b.rows.map((r, k) => (
                    <tr key={k}>
                      {r.cells.map((c, j) =>
                        r.header ? (
                          <th key={j} colSpan={c.colSpan} rowSpan={c.rowSpan}>{inlines(c.content)}</th>
                        ) : (
                          <td key={j} colSpan={c.colSpan} rowSpan={c.rowSpan}>{inlines(c.content)}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {b.source.length > 0 && <p className="abnt-source">Fonte: {inlines(b.source)}</p>}
            </div>
          )
      }
    })

  const sections = (list: Array<Section>, prefix = '', depth = 1): ReactNode =>
    list.map((s, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      return (
        <section key={s.id}>
          <h2 className={`abnt-h abnt-h${depth}`}>{number} {s.title}</h2>
          {blocks(s.blocks)}
          {sections(s.children, number, depth + 1)}
        </section>
      )
    })

  const tocEntries: Array<{ depth: number; text: string }> = []
  const collect = (list: Array<Section>, prefix = '', depth = 1) =>
    list.forEach((s, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      tocEntries.push({ depth, text: `${number} ${s.title}` })
      collect(s.children, number, depth + 1)
    })
  collect(doc.textual.sections)

  const textual = sections(doc.textual.sections)
  const appendices = doc.postTextual.appendices.map((a, i) => (
    <section key={a.id} className="abnt-page-break">
      <h2 className="abnt-h abnt-post">APÊNDICE {attachmentLetter(i)} – {a.title}</h2>
      {blocks(a.blocks)}
    </section>
  ))
  const annexes = doc.postTextual.annexes.map((a, i) => (
    <section key={a.id} className="abnt-page-break">
      <h2 className="abnt-h abnt-post">ANEXO {attachmentLetter(i)} – {a.title}</h2>
      {blocks(a.blocks)}
    </section>
  ))

  return (
    <article className="abnt-preview" style={{ fontFamily: font }} aria-label="Pré-visualização aproximada">
      {p.cover.enabled && (
        <div className="abnt-sheet abnt-cover">
          <div>
            <p className="font-bold uppercase">{m.institution}</p>
            {m.faculty && <p className="uppercase">{m.faculty}</p>}
            <p className="uppercase">{m.course}</p>
            <br />
            {m.authors.map((a) => <p key={a} className="uppercase">{a}</p>)}
          </div>
          <p><strong className="uppercase">{m.title}</strong>{m.subtitle && `: ${m.subtitle}`}</p>
          <div><p>{m.city}</p><p>{m.year}</p></div>
        </div>
      )}
      {p.titlePage.enabled && (
        <div className="abnt-sheet abnt-cover">
          <div>{m.authors.map((a) => <p key={a} className="uppercase">{a}</p>)}</div>
          <p><strong className="uppercase">{m.title}</strong>{m.subtitle && `: ${m.subtitle}`}</p>
          <div className="abnt-nature">
            <p>{m.nature}</p>
            {m.advisor && <p className="mt-2">Orientador: {m.advisor}</p>}
            {m.coAdvisor && <p>Coorientador: {m.coAdvisor}</p>}
          </div>
          <div><p>{m.city}</p><p>{m.year}</p></div>
        </div>
      )}
      {[
        { el: p.abstractPt, title: 'RESUMO', label: 'Palavras-chave:' },
        { el: p.abstractEn, title: 'ABSTRACT', label: 'Keywords:' },
      ]
        .filter((a) => a.el.enabled)
        .map((a) => (
          <div key={a.title} className="abnt-sheet">
            <h2 className="abnt-pre">{a.title}</h2>
            {a.el.text.split('\n').filter(Boolean).map((t, k) => <p key={k} className="abnt-p-noindent">{t}</p>)}
            <p className="abnt-p-noindent mt-[1.5em]"><strong>{a.label}</strong> {a.el.keywords.join('; ')}.</p>
          </div>
        ))}
      <div className="abnt-sheet">
        <h2 className="abnt-pre">SUMÁRIO</h2>
        {tocEntries.map((e, k) => (
          <p key={k} className={`abnt-toc abnt-h${e.depth}`}>{e.text}</p>
        ))}
        {doc.references.length > 0 && <p className="abnt-toc abnt-h1">REFERÊNCIAS</p>}
        <p className="mt-4 text-xs text-gray-500">Os números de página aparecem no PDF real.</p>
      </div>
      <div className="abnt-sheet">
        {textual}
        {doc.references.length > 0 && (
          <section className="abnt-page-break">
            <h2 className="abnt-h abnt-post">REFERÊNCIAS</h2>
            {sortedReferences(doc.references).map((r) => <p key={r.id} className="abnt-ref">{referenceLine(r)}</p>)}
          </section>
        )}
        {appendices}
        {annexes}
        {footnotes.length > 0 && (
          <aside className="abnt-footnotes">
            {footnotes.map((f, k) => (
              <p key={k}><sup>{k + 1}</sup> {f.type === 'footnote' ? inlines(f.content) : null}</p>
            ))}
          </aside>
        )}
      </div>
    </article>
  )
}

function sortedReferences(refs: Array<CslItem>): Array<CslItem> {
  const key = (r: CslItem) => (r.author?.[0]?.literal ?? r.author?.[0]?.family ?? r.title ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  return [...refs].sort((a, b) => key(a).localeCompare(key(b), 'pt-BR', { sensitivity: 'base' }))
}

/** Simplified reference line (the exporter applies the complete rules). */
function referenceLine(r: CslItem): ReactNode {
  const authors = (r.author ?? [])
    .map((n) => n.literal?.toLocaleUpperCase('pt-BR') ?? [n.family?.toLocaleUpperCase('pt-BR'), n.given].filter(Boolean).join(', '))
    .join('; ')
  const article = r.type === 'article-journal'
  return (
    <>
      {authors && `${authors}. `}
      {article ? `${r.title}. ` : <strong>{r.title}</strong>}
      {!article && '. '}
      {article && r['container-title'] && <><strong>{r['container-title']}</strong>, </>}
      {!article && (r['publisher-place'] || r.publisher) && `${r['publisher-place'] ?? '[S. l.]'}: ${r.publisher ?? '[s. n.]'}, `}
      {yearOf(r)}.
      {r.URL && ` Disponível em: ${r.URL}.`}
    </>
  )
}
