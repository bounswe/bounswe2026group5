// web/src/routes/_authorized/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import {getStoredUser, meQueryOptions} from "#/lib/queries/AuthQueries.ts";
import {Toaster} from "#/components/ui/sonner.tsx";

export const Route = createFileRoute('/_authorized')({
    beforeLoad: () => {
        const user = getStoredUser()
        if (!user) throw redirect({ to: '/login' })
    },
    loader: async ({ context }) => {
        const me = await context.queryClient.ensureQueryData(meQueryOptions)
        if (me && !me.app_usage_mode && me.role !== 'ADMIN') {
            throw redirect({ to: '/gettingToKnowYou' })
        }
        return me
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
