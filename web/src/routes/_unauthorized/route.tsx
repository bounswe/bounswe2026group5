import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'
import {UnauthorizedHeader} from "#/components/layout/UnauthorizedHeader.tsx";
import {UnauthorizedFooter} from "#/components/layout/UnauthorizedFooter.tsx";
import {getStoredUser} from "#/lib/queries/AuthQueries.ts";

export const Route = createFileRoute('/_unauthorized')({
    beforeLoad: () => {
        const user = getStoredUser()
        if (user) throw redirect({ to: '/dashboard' }) // already logged in
    },
  component: RouteComponent,
})

function RouteComponent() {
  return (
      <div className="flex flex-col min-h-screen bg-black/[0.02] dark:bg-background">
        <UnauthorizedHeader />
        <Outlet />
        <UnauthorizedFooter />
      </div>
  )
}
