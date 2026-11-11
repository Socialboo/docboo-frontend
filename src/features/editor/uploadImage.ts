import type { Schemas } from '#/api/client'

export type AssetResponse = Schemas['AssetResponse']

/** Uploads a figure image. The API detects PNG/JPEG from the content and enforces the size limits. */
export async function uploadImage(workId: string, file: File): Promise<AssetResponse> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`/api/works/${workId}/assets`, { method: 'POST', body: form })
  if (response.ok) return (await response.json()) as AssetResponse

  let message = `Falha no envio (HTTP ${response.status}).`
  if (response.status === 413) message = 'A imagem é grande demais.'
  else {
    try {
      const problem = (await response.json()) as { errors?: Record<string, Array<string>> }
      message = Object.values(problem.errors ?? {}).flat()[0] ?? message
    } catch {
      // keep the generic message
    }
  }
  throw new Error(message)
}
