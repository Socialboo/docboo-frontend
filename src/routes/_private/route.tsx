import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Pathless layout for pages that require an authenticated user (works, editor,
 * export, ...). URLs have no "_private" segment. Every route inside this folder
 * is protected by the guard below.
 */
export const Route = createFileRoute('/_private')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: PrivateLayout,
})

function PrivateLayout() {
  const { auth } = Route.useRouteContext()

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/works" className="font-semibold">
            Docboo
          </Link>
          <span className="text-sm text-muted-foreground">
            {auth.userName ?? 'Usuário local'}
          </span>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
