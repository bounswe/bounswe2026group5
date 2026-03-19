// web/src/routes/_authorized/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/demoAuth'

export const Route = createFileRoute('/_authorized')({
  beforeLoad: () => {
    // Protect this layout: if not authenticated, kick to login
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthorizedLayout,
})

function AuthorizedLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* TODO: Add AuthorizedHeader in Phase 2 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <span className="font-bold">Mentorship Network (Authorized)</span>
        </div>
      </header>
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}