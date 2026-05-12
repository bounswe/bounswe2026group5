import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { QueryClient } from '@tanstack/react-query'
import { queryClient } from './queryClient'

export interface RouterContext {
  queryClient: QueryClient
}

export const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

setupRouterSsrQueryIntegration({
  router,
  queryClient,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}