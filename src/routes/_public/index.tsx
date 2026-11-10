import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { healthQuery } from '#/api/queries'

export const Route = createFileRoute('/_public/')({ component: Home })

function Home() {
  const health = useQuery(healthQuery)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Docboo</h1>
      <p className="mt-2 text-muted-foreground">
        Formatador de trabalhos acadêmicos (ABNT).
      </p>
      <Link
        to="/works"
        className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
      >
        Ir para meus trabalhos
      </Link>

      <section className="mt-8 rounded-lg border p-4" aria-live="polite">
        <h2 className="font-semibold">Status da API</h2>
        {health.isPending && <p className="mt-2 text-sm">Verificando…</p>}
        {health.isError && (
          <p className="mt-2 text-sm text-destructive">
            API indisponível: {health.error.message}
          </p>
        )}
        {health.data && (
          <div className="mt-2 text-sm">
            <p data-testid="api-status">
              {health.data.status} · v{health.data.version}
            </p>
            <ul className="mt-2 list-disc pl-5">
              {health.data.checks.map((c) => (
                <li key={c.name}>
                  {c.name}: {c.status} ({c.durationMs.toFixed(0)} ms)
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}
