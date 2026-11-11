import type { Schemas } from '#/api/client'

/**
 * Document model types, all derived from the generated OpenAPI schema
 * (never declared by hand). See docboo-backend/docs/document-model.md.
 */
export type DocumentModel = Schemas['DocumentModel']
export type DocumentMetadata = Schemas['DocumentMetadata']
export type Section = Schemas['Section']
export type Attachment = Schemas['Attachment']
export type Block = Schemas['Block']
export type Inline = Schemas['Inline']
export type TextMark = Schemas['TextMark']
export type CitationMode = Schemas['CitationMode']
export type CslItem = Schemas['CslItem']
export type CslName = Schemas['CslName']

export type ParagraphBlock = Schemas['BlockParagraphBlock']
export type LongQuoteBlock = Schemas['BlockLongQuoteBlock']
export type ListBlock = Schemas['BlockListBlock']
export type FigureBlock = Schemas['BlockFigureBlock']
export type TableBlock = Schemas['BlockTableBlock']
export type TextInline = Schemas['InlineTextInline']
export type CitationInline = Schemas['InlineCitationInline']
export type FootnoteInline = Schemas['InlineFootnoteInline']

/** Where a piece of content lives: a textual section, an appendix or an annex. */
export type ContentKind = 'section' | 'appendix' | 'annex'

export interface ContentRef {
  kind: ContentKind
  id: string
}
