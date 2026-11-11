import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { BlockIds, Citation, DocTable, Figure, Footnote, LongQuote } from './nodes'

/**
 * The editor schema mirrors the document model exactly: headings come from the section tree, and
 * anything the model cannot represent (links, code, headings, quotes, rules, strike) is not registered,
 * so pasted HTML is reduced to supported content.
 */
export function editorExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      strike: false,
      link: false,
    }),
    Superscript,
    Subscript,
    BlockIds,
    LongQuote,
    Figure,
    Citation,
    Footnote,
    DocTable.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: 'Escreva o texto desta seção…' }),
  ]
}
