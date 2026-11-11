import type { JSONContent } from '@tiptap/core'
import { isValidId, newId } from './ids'
import type { Block, CitationMode, Inline, TextMark } from './types'

/**
 * Conversion between the document model (source of truth) and the Tiptap/ProseMirror JSON of one
 * section. Only the node types registered by the editor exist, so pasted HTML can never reach the
 * model: anything else is dropped by the schema before it gets here.
 *
 * Simplifications (MVP): footnote, caption and source content is edited as plain text; list items
 * are flat (nested lists are flattened).
 */

const MARKS: ReadonlyArray<TextMark> = ['bold', 'italic', 'underline', 'superscript', 'subscript']

// ---------- model → Tiptap ----------

export function blocksToTiptap(blocks: Array<Block>): JSONContent {
  const content = blocks.map(blockToNode)
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph', attrs: { id: null } }] }
}

function blockToNode(block: Block): JSONContent {
  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', attrs: { id: block.id }, content: inlinesToNodes(block.content) }
    case 'longQuote':
      return { type: 'longQuote', attrs: { id: block.id }, content: inlinesToNodes(block.content) }
    case 'list':
      return {
        type: block.ordered ? 'orderedList' : 'bulletList',
        attrs: { id: block.id },
        content: block.items.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inlinesToNodes(item.content) }],
        })),
      }
    case 'figure':
      return {
        type: 'figure',
        attrs: {
          id: block.id,
          assetId: block.assetId,
          caption: plainText(block.caption),
          source: plainText(block.source),
          widthPercent: block.widthPercent,
        },
      }
    case 'table':
      return {
        type: 'table',
        attrs: { id: block.id, title: plainText(block.title), source: plainText(block.source) },
        content: block.rows.map((row) => ({
          type: 'tableRow',
          content: row.cells.map((cell) => ({
            type: row.header ? 'tableHeader' : 'tableCell',
            attrs: { colspan: cell.colSpan, rowspan: cell.rowSpan },
            content: [{ type: 'paragraph', content: inlinesToNodes(cell.content) }],
          })),
        })),
      }
  }
}

function inlinesToNodes(inlines: Array<Inline>): Array<JSONContent> | undefined {
  const nodes = inlines.flatMap((inline): Array<JSONContent> => {
    switch (inline.type) {
      case 'text':
        return inline.text
          ? [{ type: 'text', text: inline.text, ...(inline.marks.length > 0 ? { marks: inline.marks.map((m) => ({ type: m })) } : {}) }]
          : []
      case 'hardBreak':
        return [{ type: 'hardBreak' }]
      case 'citation':
        return [{ type: 'citation', attrs: { refIds: inline.refIds, locator: inline.locator ?? '', mode: inline.mode } }]
      case 'footnote':
        return [{ type: 'footnote', attrs: { id: inline.id, text: plainText(inline.content) } }]
    }
  })
  return nodes.length > 0 ? nodes : undefined
}

/** Plain text of inline content (citations and footnotes are omitted). */
export function plainText(inlines: Array<Inline>): string {
  return inlines
    .map((i) => (i.type === 'text' ? i.text : i.type === 'hardBreak' ? ' ' : ''))
    .join('')
    .trim()
}

export function textInlines(text: string): Array<Inline> {
  const trimmed = text.trim()
  return trimmed ? [{ type: 'text', text: trimmed, marks: [] }] : []
}

// ---------- Tiptap → model ----------

export function tiptapToBlocks(doc: JSONContent): Array<Block> {
  const blocks: Array<Block> = []
  for (const node of doc.content ?? []) {
    const block = nodeToBlock(node)
    if (block) blocks.push(block)
  }
  return blocks
}

function idOf(node: JSONContent, prefix: string): string {
  const id = node.attrs?.id as string | null | undefined
  return isValidId(id) ? id : newId(prefix)
}

function nodeToBlock(node: JSONContent): Block | null {
  switch (node.type) {
    case 'paragraph': {
      const content = nodesToInlines(node.content)
      // Empty paragraphs are layout, not content: they are not exported.
      if (content.length === 0) return null
      return { type: 'paragraph', id: idOf(node, 'p'), content }
    }
    case 'longQuote': {
      const content = nodesToInlines(node.content)
      return content.length === 0 ? null : { type: 'longQuote', id: idOf(node, 'q'), content }
    }
    case 'bulletList':
    case 'orderedList': {
      const items = listItems(node).filter((content) => content.length > 0).map((content) => ({ content }))
      return items.length === 0 ? null : { type: 'list', id: idOf(node, 'l'), ordered: node.type === 'orderedList', items }
    }
    case 'figure': {
      const a = node.attrs ?? {}
      return {
        type: 'figure',
        id: idOf(node, 'f'),
        assetId: String(a.assetId ?? ''),
        caption: textInlines(String(a.caption ?? '')),
        source: textInlines(String(a.source ?? '')),
        widthPercent: clampWidth(Number(a.widthPercent ?? 80)),
      }
    }
    case 'table': {
      const rows = (node.content ?? []).filter((r) => r.type === 'tableRow').map((row) => {
        const cells = row.content ?? []
        return {
          header: cells.length > 0 && cells.every((c) => c.type === 'tableHeader'),
          cells: cells.map((cell) => ({
            content: joinParagraphs(cell.content),
            colSpan: Math.max(1, Number(cell.attrs?.colspan ?? 1)),
            rowSpan: Math.max(1, Number(cell.attrs?.rowspan ?? 1)),
          })),
        }
      })
      if (rows.length === 0) return null
      return {
        type: 'table',
        id: idOf(node, 't'),
        title: textInlines(String(node.attrs?.title ?? '')),
        source: textInlines(String(node.attrs?.source ?? '')),
        rows,
      }
    }
    default:
      return null
  }
}

function clampWidth(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(10, Math.round(value))) : 80
}

/** List items flattened: each item's paragraphs (and nested items) become separate items. */
function listItems(list: JSONContent): Array<Array<Inline>> {
  const result: Array<Array<Inline>> = []
  for (const item of list.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type === 'paragraph') result.push(nodesToInlines(child.content))
      else if (child.type === 'bulletList' || child.type === 'orderedList') result.push(...listItems(child))
    }
  }
  return result
}

/** Cell content: paragraphs joined with line breaks. */
function joinParagraphs(paragraphs: Array<JSONContent> | undefined): Array<Inline> {
  const result: Array<Inline> = []
  for (const p of paragraphs ?? []) {
    const inlines = nodesToInlines(p.content)
    if (inlines.length === 0) continue
    if (result.length > 0) result.push({ type: 'hardBreak' })
    result.push(...inlines)
  }
  return result
}

function nodesToInlines(nodes: Array<JSONContent> | undefined): Array<Inline> {
  const result: Array<Inline> = []
  for (const node of nodes ?? []) {
    switch (node.type) {
      case 'text': {
        if (!node.text) break
        const marks = (node.marks ?? [])
          .map((m) => m.type as TextMark)
          .filter((m) => MARKS.includes(m))
        const sorted = MARKS.filter((m) => marks.includes(m))
        const last = result.at(-1)
        // Adjacent text with the same marks is merged (ProseMirror splits it after edits).
        if (last?.type === 'text' && last.marks.join() === sorted.join()) {
          result[result.length - 1] = { ...last, text: last.text + node.text }
        } else {
          result.push({ type: 'text', text: node.text, marks: sorted })
        }
        break
      }
      case 'hardBreak':
        result.push({ type: 'hardBreak' })
        break
      case 'citation': {
        const refIds = (node.attrs?.refIds as Array<string> | undefined) ?? []
        if (refIds.length === 0) break
        const locator = String(node.attrs?.locator ?? '').trim()
        result.push({
          type: 'citation',
          refIds,
          locator: locator || null,
          mode: (node.attrs?.mode as CitationMode | undefined) ?? 'parenthetical',
        })
        break
      }
      case 'footnote': {
        const id = node.attrs?.id as string | undefined
        result.push({
          type: 'footnote',
          id: isValidId(id) ? id : newId('fn'),
          content: textInlines(String(node.attrs?.text ?? '')),
        })
        break
      }
    }
  }
  return result
}
