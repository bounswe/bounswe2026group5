import { GoogleOAuthProvider } from '@react-oauth/google';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import { Toaster } from "#/components/ui/sonner.tsx";
import type { RouterContext } from "#/router.tsx";
import '../styles.css';

import { usePushNotifications } from '#/hooks/usePushNotifications';
import { meQueryOptions } from '#/lib/queries/AuthQueries';
import { useQuery } from '@tanstack/react-query';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const { data: user } = useQuery(meQueryOptions)
  usePushNotifications(!!user, user?.username)

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Outlet />
      <Toaster 
        position="bottom-center" 
        toastOptions={{ classNames: { toast: 'cn-toast' } }} 
        style={{ zIndex: 9999 }} 
      />
    </GoogleOAuthProvider>
  )
}