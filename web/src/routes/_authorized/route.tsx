// web/src/routes/_authorized/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import {getStoredUser} from "#/lib/queries/Authqueries.ts";

export const Route = createFileRoute('/_authorized')({
    beforeLoad: () => {
        const user = getStoredUser()
        if (!user) throw redirect({ to: '/login' })
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