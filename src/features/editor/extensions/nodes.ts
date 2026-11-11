import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Table } from '@tiptap/extension-table'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CitationView } from './CitationView'
import { FigureView } from './FigureView'
import { FootnoteView } from './FootnoteView'

/** Node types that map to document blocks and therefore carry a stable id. */
const BLOCK_TYPES = ['paragraph', 'bulletList', 'orderedList', 'longQuote', 'figure', 'table']

declare module '@tiptap/core' {
  // Declaration merging: the type parameter must keep Tiptap's own name.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Commands<ReturnType> {
    longQuote: {
      toggleLongQuote: () => ReturnType
    }
  }
}

/**
 * Keeps each block's id from the document model on its node. Splitting a paragraph (Enter) does not
 * copy the id, so the new paragraph gets a fresh one when converted.
 */
export const BlockIds = Extension.create({
  name: 'blockIds',
  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          id: { default: null, keepOnSplit: false, rendered: false },
        },
      },
    ]
  },
})

/** Direct quotation longer than three lines (formatted by the profile on export). */
export const LongQuote = Node.create({
  name: 'longQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'blockquote[data-long-quote]' }],
  renderHTML: ({ HTMLAttributes }) => ['blockquote', mergeAttributes(HTMLAttributes, { 'data-long-quote': '', class: 'long-quote' }), 0],
  addCommands() {
    return {
      toggleLongQuote:
        () =>
        ({ commands, editor }) =>
          editor.isActive('longQuote') ? commands.setParagraph() : commands.setNode(this.name),
    }
  },
})

/** Figure: uploaded image with caption ("Figura N – ...") and source, edited in the side panel. */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({
    assetId: { default: '' },
    caption: { default: '' },
    source: { default: '' },
    widthPercent: { default: 80 },
  }),
  parseHTML: () => [{ tag: 'figure[data-asset-id]' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', mergeAttributes(HTMLAttributes, { 'data-asset-id': HTMLAttributes.assetId })],
  addNodeView: () => ReactNodeViewRenderer(FigureView),
})

/** Author-date citation of one or more references. */
export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({
    refIds: { default: [] },
    locator: { default: '' },
    mode: { default: 'parenthetical' },
  }),
  parseHTML: () => [{ tag: 'span[data-citation]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-citation': '' })],
  addNodeView: () => ReactNodeViewRenderer(CitationView, { as: 'span' }),
})

/** Footnote mark; its text is edited in the side panel. Numbered with a CSS counter. */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({
    id: { default: null, keepOnSplit: false },
    text: { default: '' },
  }),
  parseHTML: () => [{ tag: 'sup[data-footnote]' }],
  renderHTML: ({ HTMLAttributes }) => ['sup', mergeAttributes(HTMLAttributes, { 'data-footnote': '' })],
  addNodeView: () => ReactNodeViewRenderer(FootnoteView, { as: 'span' }),
})

/** Table with the title and source lines of the model. */
export const DocTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: { default: '', rendered: false },
      source: { default: '', rendered: false },
    }
  },
})
