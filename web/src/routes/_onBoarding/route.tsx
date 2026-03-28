import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'
import {isAuthenticated} from "#/lib/demoAuth.ts";

// This route was needed to block linking to other pages.
// (If it were in authorized layout for example, user can go into dashboard directly.
export const Route = createFileRoute('/_onBoarding')({
    beforeLoad: () => {
        if (!isAuthenticated()) {
            throw redirect({ to: '/login' })
        }
    },
  component: RouteComponent,
})

function RouteComponent() {
  return (
      <div className="flex flex-col min-h-screen bg-black/[0.02] dark:bg-background">
          <Outlet />
      </div>
    )
}
