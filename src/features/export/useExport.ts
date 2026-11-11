import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Schemas } from '#/api/client'
import type { FieldErrors } from '#/features/work/WorkProvider'
import { api } from '#/api/client'
import { exportsQuery } from '#/api/queries'
import { useWork } from '#/features/work/WorkProvider'

export type ExportJob = Schemas['ExportJobResponse']
export type ExportFormat = Schemas['ExportFormat']

/** The work is not ready to export: the API listed what is missing, by document path. */
export class NotReadyError extends Error {
  constructor(readonly errors: FieldErrors) {
    super('O trabalho ainda não pode ser exportado.')
  }
}

/** Saves pending edits, then queues an export of the current document. */
export function useCreateExport() {
  const { workId, flush } = useWork()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (format: ExportFormat): Promise<ExportJob> => {
      if (!(await flush())) throw new Error('Não foi possível salvar as alterações antes de exportar.')
      const { data, error, response } = await api.POST('/api/works/{workId}/exports', {
        params: { path: { workId } },
        body: { format },
      })
      if (data) return data
      if (response.status === 400) throw new NotReadyError((error as { errors?: FieldErrors } | undefined)?.errors ?? {})
      throw new Error(`Falha ao pedir a exportação (HTTP ${response.status}).`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exportsQuery(workId).queryKey }),
  })
}

/** Polls one job until it finishes. */
export async function waitForJob(id: string, onProgress?: (job: ExportJob) => void, signal?: AbortSignal): Promise<ExportJob> {
  for (;;) {
    const { data } = await api.GET('/api/exports/{id}', { params: { path: { id } }, signal })
    if (!data) throw new Error('Exportação não encontrada.')
    onProgress?.(data)
    if (data.status !== 'queued' && data.status !== 'running') return data
    await new Promise((r) => setTimeout(r, 750))
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  }
}

/** Where to go to fix a readiness error, from its document path. */
export function fixLocation(path: string): { route: 'metadata' | 'editor'; label: string } {
  if (path.startsWith('metadata.') || path.startsWith('preTextual.')) return { route: 'metadata', label: 'Capa e folha de rosto' }
  return { route: 'editor', label: 'Editor' }
}
