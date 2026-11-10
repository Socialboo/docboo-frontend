import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { worksQuery } from '#/api/queries'

export const Route = createFileRoute('/_private/works/')({
  component: WorksPage,
})

function WorksPage() {
  const works = useQuery(worksQuery)

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Meus trabalhos</h1>

      {works.isPending && <p className="mt-4 text-sm">Carregando…</p>}
      {works.isError && (
        <p className="mt-4 text-sm text-destructive">
          Não foi possível carregar: {works.error.message}
        </p>
      )}
      {works.data?.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum trabalho ainda.
        </p>
      )}
      {works.data && works.data.length > 0 && (
        <ul className="mt-4 divide-y rounded-lg border">
          {works.data.map((w) => (
            <li key={w.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{w.title}</span>
              <span className="text-xs text-muted-foreground">
                v{w.version} · {new Date(w.updatedAt).toLocaleString('pt-BR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
