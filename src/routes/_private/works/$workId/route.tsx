import { Suspense } from 'react'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { workQuery } from '#/api/queries'
import { SaveIndicator } from '#/features/work/SaveIndicator'
import { WorkProvider, useWork } from '#/features/work/WorkProvider'

export const Route = createFileRoute('/_private/works/$workId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workQuery(params.workId)),
  component: WorkLayout,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-destructive" role="alert">{(error as Error).message}</p>
      <Link to="/works" className="mt-4 inline-block text-sm underline">Voltar para meus trabalhos</Link>
    </main>
  ),
})

const tabs = [
  { to: '/works/$workId/metadata', label: 'Capa e folha de rosto' },
  { to: '/works/$workId/editor', label: 'Editor' },
  { to: '/works/$workId/preview', label: 'Pré-visualização' },
  { to: '/works/$workId/export', label: 'Exportar' },
] as const

function WorkLayout() {
  const { workId } = Route.useParams()
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Carregando trabalho…</p>}>
      <WorkProvider workId={workId}>
        <WorkHeader />
        <Outlet />
      </WorkProvider>
    </Suspense>
  )
}

function WorkHeader() {
  const { workId, title } = useWork()
  return (
    <div className="border-b bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link to="/works" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Trabalhos
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-semibold" title={title}>{title}</h1>
        <SaveIndicator />
        <nav className="flex gap-1" aria-label="Seções do trabalho">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={{ workId }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-muted font-medium !text-foreground', 'aria-current': 'page' }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
