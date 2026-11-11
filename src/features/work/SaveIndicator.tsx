import { AlertTriangle, Check, CloudOff, Loader2, Pencil } from 'lucide-react'
import { useWork } from './WorkProvider'
import { Button } from '#/components/ui/button'

/** Autosave status shown in the work header. */
export function SaveIndicator() {
  const { saveState, reload, overwrite } = useWork()

  switch (saveState) {
    case 'saving':
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" /> Salvando…
        </span>
      )
    case 'dirty':
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
          <Pencil className="size-3.5" /> Alterações não salvas
        </span>
      )
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-destructive" role="status">
          <CloudOff className="size-3.5" /> Sem conexão, tentando de novo…
        </span>
      )
    case 'invalid':
      return (
        <span className="flex items-center gap-1 text-xs text-destructive" role="status">
          <AlertTriangle className="size-3.5" /> Não salvo: há dados inválidos
        </span>
      )
    case 'conflict':
      return (
        <span className="flex items-center gap-2 text-xs text-destructive" role="alert">
          <AlertTriangle className="size-3.5" /> Este trabalho foi alterado em outra janela.
          <Button size="xs" variant="outline" title="Descarta as alterações desta janela" onClick={() => void reload()}>
            Recarregar
          </Button>
          <Button size="xs" title="Salva esta versão por cima da outra" onClick={() => void overwrite()}>
            Manter as minhas
          </Button>
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
          <Check className="size-3.5" /> Salvo
        </span>
      )
  }
}
