import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

/**
 * Pathless layout for pages that do not require authentication
 * (landing page and, later, login/sign-up). URLs have no "_public" segment.
 */
export const Route = createFileRoute('/_public')({ component: PublicLayout })

function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="font-semibold">
            Docboo
          </Link>
          <Link to="/works" className="text-sm">
            Entrar
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
