import {Outlet, createRootRouteWithContext} from '@tanstack/react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'

import '../styles.css'
import type {RouterContext} from "#/router.tsx";
import {Toaster} from "#/components/ui/sonner.tsx";

import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries'
import { usePushNotifications } from '#/hooks/usePushNotifications'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { data: user } = useQuery(meQueryOptions)
  usePushNotifications(!!user)

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Outlet />
      <Toaster position="bottom-center" />
    </GoogleOAuthProvider>
  )
}