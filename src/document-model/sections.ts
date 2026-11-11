import { newId } from './ids'
import type { Attachment, Block, ContentRef, DocumentModel, Section } from './types'

/** Deepest heading level (ABNT profile: 5). */
export const MAX_DEPTH = 5

export interface SectionLocation {
  section: Section
  depth: number
  /** Progressive number, e.g. "2.1.3". */
  number: string
  parent: Section | null
  siblings: Array<Section>
  index: number
}

/** Walks the textual sections depth-first with their numbering. */
export function walkSections(
  sections: Array<Section>,
  visit: (loc: SectionLocation) => void,
  parent: Section | null = null,
  prefix = '',
  depth = 1,
): void {
  sections.forEach((section, index) => {
    const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
    visit({ section, depth, number, parent, siblings: sections, index })
    walkSections(section.children, visit, section, number, depth + 1)
  })
}

export function findSection(doc: DocumentModel, id: string): SectionLocation | null {
  let found: SectionLocation | null = null
  walkSections(doc.textual.sections, (loc) => {
    if (loc.section.id === id) found = loc
  })
  return found
}

function mapSections(
  sections: Array<Section>,
  fn: (list: Array<Section>, parent: Section | null) => Array<Section>,
  parent: Section | null = null,
): Array<Section> {
  return fn(sections, parent).map((s) => ({
    ...s,
    children: mapSections(s.children, fn, s),
  }))
}

function withSections(doc: DocumentModel, sections: Array<Section>): DocumentModel {
  return { ...doc, textual: { sections } }
}

export function updateSection(
  doc: DocumentModel,
  id: string,
  update: (s: Section) => Section,
): DocumentModel {
  return withSections(
    doc,
    mapSections(doc.textual.sections, (list) => list.map((s) => (s.id === id ? update(s) : s))),
  )
}

export function newSection(title: string): Section {
  return { id: newId('sec'), title, blocks: [], children: [] }
}

/** Adds a section after `afterId` (same level) or, with `parentId`, as the last child. */
export function addSection(
  doc: DocumentModel,
  section: Section,
  position: { afterId?: string; parentId?: string } = {},
): DocumentModel {
  if (position.parentId) {
    const parent = findSection(doc, position.parentId)
    if (!parent || parent.depth >= MAX_DEPTH) return doc
    return updateSection(doc, position.parentId, (s) => ({ ...s, children: [...s.children, section] }))
  }
  if (position.afterId) {
    return withSections(
      doc,
      mapSections(doc.textual.sections, (list) => {
        const i = list.findIndex((s) => s.id === position.afterId)
        return i < 0 ? list : [...list.slice(0, i + 1), section, ...list.slice(i + 1)]
      }),
    )
  }
  return withSections(doc, [...doc.textual.sections, section])
}

export function removeSection(doc: DocumentModel, id: string): DocumentModel {
  const next = withSections(
    doc,
    mapSections(doc.textual.sections, (list) => list.filter((s) => s.id !== id)),
  )
  // A work always keeps at least one section.
  return next.textual.sections.length === 0 ? doc : next
}

/** Moves a section up or down among its siblings. */
export function moveSection(doc: DocumentModel, id: string, direction: -1 | 1): DocumentModel {
  return withSections(
    doc,
    mapSections(doc.textual.sections, (list) => {
      const i = list.findIndex((s) => s.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    }),
  )
}

// ---------- appendices and annexes ----------

type AttachmentKind = 'appendix' | 'annex'

function attachmentsOf(doc: DocumentModel, kind: AttachmentKind): Array<Attachment> {
  return kind === 'appendix' ? doc.postTextual.appendices : doc.postTextual.annexes
}

function withAttachments(doc: DocumentModel, kind: AttachmentKind, list: Array<Attachment>): DocumentModel {
  return {
    ...doc,
    postTextual: kind === 'appendix' ? { ...doc.postTextual, appendices: list } : { ...doc.postTextual, annexes: list },
  }
}

export function addAttachment(doc: DocumentModel, kind: AttachmentKind, title: string): [DocumentModel, string] {
  const attachment: Attachment = { id: newId(kind === 'appendix' ? 'ap' : 'an'), title, blocks: [] }
  return [withAttachments(doc, kind, [...attachmentsOf(doc, kind), attachment]), attachment.id]
}

export function updateAttachment(
  doc: DocumentModel,
  kind: AttachmentKind,
  id: string,
  update: (a: Attachment) => Attachment,
): DocumentModel {
  return withAttachments(doc, kind, attachmentsOf(doc, kind).map((a) => (a.id === id ? update(a) : a)))
}

export function removeAttachment(doc: DocumentModel, kind: AttachmentKind, id: string): DocumentModel {
  return withAttachments(doc, kind, attachmentsOf(doc, kind).filter((a) => a.id !== id))
}

export function moveAttachment(doc: DocumentModel, kind: AttachmentKind, id: string, direction: -1 | 1): DocumentModel {
  const list = [...attachmentsOf(doc, kind)]
  const i = list.findIndex((a) => a.id === id)
  const j = i + direction
  if (i < 0 || j < 0 || j >= list.length) return doc
  ;[list[i], list[j]] = [list[j], list[i]]
  return withAttachments(doc, kind, list)
}

/** "A", "B", ..., "Z", "AA", ... (same as the exporter). */
export function attachmentLetter(index: number): string {
  let n = index + 1
  let result = ''
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

// ---------- content of any editable unit ----------

export function getBlocks(doc: DocumentModel, ref: ContentRef): Array<Block> | null {
  if (ref.kind === 'section') return findSection(doc, ref.id)?.section.blocks ?? null
  return attachmentsOf(doc, ref.kind).find((a) => a.id === ref.id)?.blocks ?? null
}

export function setBlocks(doc: DocumentModel, ref: ContentRef, blocks: Array<Block>): DocumentModel {
  if (ref.kind === 'section') return updateSection(doc, ref.id, (s) => ({ ...s, blocks }))
  return updateAttachment(doc, ref.kind, ref.id, (a) => ({ ...a, blocks }))
}
