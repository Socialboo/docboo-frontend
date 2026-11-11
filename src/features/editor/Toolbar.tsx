import { useRef } from 'react'
import { useEditorState } from '@tiptap/react'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  MessageSquareQuote,
  Redo2,
  StickyNote,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table as TableIcon,
  Underline,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from './uploadImage'
import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { newId } from '#/document-model/ids'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'

export function Toolbar({ editor, workId }: { editor: Editor; workId: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      superscript: e.isActive('superscript'),
      subscript: e.isActive('subscript'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      longQuote: e.isActive('longQuote'),
      inTable: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const insertFigure = async (file: File) => {
    const toastId = toast.loading('Enviando imagem…')
    try {
      const asset = await uploadImage(workId, file)
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'figure',
          attrs: { id: newId('f'), assetId: asset.id, caption: '', source: '', widthPercent: 80 },
        })
        .run()
      toast.success('Imagem enviada. Preencha a legenda e a fonte no painel ao lado.', { id: toastId })
    } catch (e) {
      toast.error((e as Error).message, { id: toastId })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-background px-2 py-1" role="toolbar" aria-label="Formatação">
      <Tool label="Negrito (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Itálico (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Sublinhado (Ctrl+U)" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline />
      </Tool>
      <Tool label="Sobrescrito" active={state.superscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        <SupIcon />
      </Tool>
      <Tool label="Subscrito" active={state.subscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        <SubIcon />
      </Tool>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Tool label="Lista com marcadores" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Alíneas (a, b, c)" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label="Citação longa (mais de 3 linhas)" active={state.longQuote} onClick={() => editor.chain().focus().toggleLongQuote().run()}>
        <MessageSquareQuote />
      </Tool>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Tool label="Inserir figura" onClick={() => fileRef.current?.click()}>
        <ImagePlus />
      </Tool>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void insertFigure(file)
        }}
      />
      <Tool
        label="Inserir tabela"
        disabled={state.inTable}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .updateAttributes('table', { id: newId('t') })
            .run()
        }
      >
        <TableIcon />
      </Tool>
      <Tool
        label="Inserir nota de rodapé"
        onClick={() => {
          // Select the new footnote so the side panel opens its text field.
          const pos = editor.state.selection.from
          editor
            .chain()
            .focus()
            .insertContent({ type: 'footnote', attrs: { id: newId('fn'), text: '' } })
            .setNodeSelection(pos)
            .run()
        }}
      >
        <StickyNote />
      </Tool>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Tool label="Desfazer (Ctrl+Z)" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label="Refazer (Ctrl+Y)" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 />
      </Tool>
    </div>
  )
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            // Formatting buttons must not take the focus away from the text being edited.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
