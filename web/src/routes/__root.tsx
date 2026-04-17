import {Outlet, createRootRouteWithContext} from '@tanstack/react-router'

import '../styles.css'
import type {RouterContext} from "#/router.tsx";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}