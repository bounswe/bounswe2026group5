import {Outlet, createRootRouteWithContext} from '@tanstack/react-router'

import '../styles.css'
import type {RouterContext} from "#/router.tsx";
import {Toaster} from "#/components/ui/sonner.tsx";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
        <Toaster position="bottom-center" />
    </>
  )
}