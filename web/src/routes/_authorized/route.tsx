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
    loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions),
  component: AuthorizedLayout,
})

function AuthorizedLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-black/[0.02] dark:bg-background">
      <AuthorizedHeader />
      
      <main className="flex-1">
        <Outlet />
      </main>
        <Toaster position="bottom-right" toastOptions={{ classNames: { toast: 'cn-toast' } }} style={{ zIndex: 9999 }} />
    </div>
  )
}