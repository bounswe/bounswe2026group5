import {Outlet, createRootRouteWithContext} from '@tanstack/react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'

import '../styles.css'
import type {RouterContext} from "#/router.tsx";
import {Toaster} from "#/components/ui/sonner.tsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Outlet />
      <Toaster position="bottom-center" />
    </GoogleOAuthProvider>
  )
}