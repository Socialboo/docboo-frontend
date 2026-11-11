import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Download, FileText, FileType, Loader2 } from 'lucide-react'
import { NotReadyError, fixLocation, useCreateExport } from './useExport'
import type { ExportJob } from './useExport'
import { exportsQuery } from '#/api/queries'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useWork } from '#/features/work/WorkProvider'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const STATUS: Record<ExportJob['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Na fila', variant: 'secondary' },
  running: { label: 'Gerando…', variant: 'secondary' },
  succeeded: { label: 'Pronto', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  expired: { label: 'Expirado', variant: 'outline' },
}

export function ExportPage() {
  const { workId } = useWork()
  const jobs = useQuery(exportsQuery(workId))
  const create = useCreateExport()
  const notReady = create.error instanceof NotReadyError ? create.error : null

  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-6">
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Exportar</h2>
        <p className="text-sm text-muted-foreground">
          O arquivo é gerado a partir da versão salva, formatado pela norma do trabalho. O PDF é a conversão do próprio .docx.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={create.isPending} onClick={() => create.mutate('docx')}>
            <FileText /> Exportar .docx
          </Button>
          <Button disabled={create.isPending} variant="secondary" onClick={() => create.mutate('pdf')}>
            <FileType /> Exportar PDF
          </Button>
          {create.isPending && <Loader2 className="size-5 animate-spin self-center text-muted-foreground" aria-label="Pedindo exportação" />}
        </div>
      </section>

      {notReady && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Faltam informações para exportar</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 grid gap-1">
              {Object.entries(notReady.errors).map(([path, messages]) => {
                const fix = fixLocation(path)
                return (
                  <li key={path}>
                    {messages.join(' ')}{' '}
                    <Link
                      to={fix.route === 'metadata' ? '/works/$workId/metadata' : '/works/$workId/editor'}
                      params={{ workId }}
                      className="underline"
                    >
                      Corrigir em {fix.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {create.error && !notReady && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{create.error.message}</AlertTitle>
        </Alert>
      )}

      <section className="grid gap-2">
        <h3 className="font-medium">Exportações recentes</h3>
        {jobs.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>}
        <ul className="divide-y rounded-lg border">
          {jobs.data?.map((job) => (
            <li key={job.id} className="grid gap-1 p-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase">{job.format}</span>
                <Badge variant={STATUS[job.status].variant}>{STATUS[job.status].label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {dateFormat.format(new Date(job.createdAt))} · versão {job.documentVersion}
                </span>
                {job.downloadUrl && (
                  <Button size="sm" variant="outline" className="ml-auto" nativeButton={false} render={<a href={job.downloadUrl} download={job.fileName} />}>
                    <Download /> Baixar
                  </Button>
                )}
              </div>
              {job.error && <p className="text-xs text-destructive">{job.error}</p>}
              {job.warnings.map((w) => (
                <p key={w} className="text-xs text-amber-700">
                  {w}
                </p>
              ))}
              {job.expiresAt && job.status === 'succeeded' && (
                <p className="text-xs text-muted-foreground">Disponível até {dateFormat.format(new Date(job.expiresAt))}.</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
