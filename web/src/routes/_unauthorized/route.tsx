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
      <div className="flex flex-col min-h-screen bg-bg dark:bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <UnauthorizedHeader />
        <Outlet />
        <UnauthorizedFooter />
      </div>
  )
}
