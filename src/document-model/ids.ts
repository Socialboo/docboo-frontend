import type { Block, DocumentModel, Inline, Section } from './types'

/** Ids accepted by the API: letters, digits, '-' and '_', starting with a letter or digit, ≤ 64 chars. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

export function isValidId(id: string | null | undefined): id is string {
  return !!id && ID_PATTERN.test(id)
}

/**
 * Sections, blocks, attachments and footnotes share one id namespace in the API.
 * Copy/paste in the editor duplicates node ids, so before saving every duplicate
 * or invalid id is replaced. Returns the same object when nothing changed.
 */
export function ensureUniqueIds(doc: DocumentModel): DocumentModel {
  const seen = new Set<string>()
  // Mutated inside `claim`; the annotation keeps TypeScript from narrowing it to `false`.
  let changed = false as boolean

  const claim = (id: string, prefix: string): string => {
    if (isValidId(id) && !seen.has(id)) {
      seen.add(id)
      return id
    }
    changed = true
    let fresh = newId(prefix)
    while (seen.has(fresh)) fresh = newId(prefix)
    seen.add(fresh)
    return fresh
  }

  const inlines = (list: Array<Inline>): Array<Inline> =>
    list.map((i) =>
      i.type === 'footnote'
        ? { ...i, id: claim(i.id, 'fn'), content: inlines(i.content) }
        : i,
    )

  const blocks = (list: Array<Block>): Array<Block> =>
    list.map((b): Block => {
      const id = claim(b.id, b.type === 'paragraph' ? 'p' : b.type)
      switch (b.type) {
        case 'paragraph':
        case 'longQuote':
          return { ...b, id, content: inlines(b.content) }
        case 'list':
          return {
            ...b,
            id,
            items: b.items.map((it) => ({ content: inlines(it.content) })),
          }
        case 'figure':
          return {
            ...b,
            id,
            caption: inlines(b.caption),
            source: inlines(b.source),
          }
        case 'table':
          return {
            ...b,
            id,
            title: inlines(b.title),
            source: inlines(b.source),
            rows: b.rows.map((r) => ({
              ...r,
              cells: r.cells.map((c) => ({ ...c, content: inlines(c.content) })),
            })),
          }
      }
    })

  const sections = (list: Array<Section>): Array<Section> =>
    list.map((s) => ({
      ...s,
      id: claim(s.id, 'sec'),
      blocks: blocks(s.blocks),
      children: sections(s.children),
    }))

  const next: DocumentModel = {
    ...doc,
    textual: { sections: sections(doc.textual.sections) },
    postTextual: {
      appendices: doc.postTextual.appendices.map((a) => ({
        ...a,
        id: claim(a.id, 'ap'),
        blocks: blocks(a.blocks),
      })),
      annexes: doc.postTextual.annexes.map((a) => ({
        ...a,
        id: claim(a.id, 'an'),
        blocks: blocks(a.blocks),
      })),
    },
  }
  return changed ? next : doc
}
