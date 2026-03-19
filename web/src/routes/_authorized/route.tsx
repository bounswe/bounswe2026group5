// web/src/routes/_authorized/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/demoAuth'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'

export const Route = createFileRoute('/_authorized')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthorizedLayout,
})

function AuthorizedLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-black/[0.02] dark:bg-background">
      <AuthorizedHeader />
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}