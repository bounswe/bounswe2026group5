import {createFileRoute, Outlet} from '@tanstack/react-router'
import {UnauthorizedHeader} from "#/components/layout/UnauthorizedHeader.tsx";
import {UnauthorizedFooter} from "#/components/layout/UnauthorizedFooter.tsx";

export const Route = createFileRoute('/_unauthorized')({
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
