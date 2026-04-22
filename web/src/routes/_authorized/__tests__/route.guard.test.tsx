import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getStoredUserMock, ensureQueryDataMock } = vi.hoisted(() => ({
  getStoredUserMock: vi.fn(),
  ensureQueryDataMock: vi.fn(),
}))

vi.mock('@/components/layout/AuthorizedHeader', () => ({
  AuthorizedHeader: () => <div data-testid="authorized-header" />,
}))

vi.mock('#/components/ui/sonner.tsx', () => ({
  Toaster: () => null,
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  getStoredUser: getStoredUserMock,
  meQueryOptions: { queryKey: ['me'] },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => options,
    redirect: (options: { to: string }) => ({ ...options, __redirect: true }),
    Outlet: () => <div data-testid="outlet" />,
  }
})

import { Route } from '../route'

type RouteShape = {
  beforeLoad: () => void
  loader: (args: { context: { queryClient: { ensureQueryData: typeof ensureQueryDataMock } } }) => Promise<unknown>
}

const typedRoute = Route as unknown as RouteShape

describe('Authorized route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when there is no stored user', () => {
    getStoredUserMock.mockReturnValue(null)

    let thrown: unknown
    try {
      typedRoute.beforeLoad()
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual({ to: '/login', __redirect: true })
  })

  it('allows navigation when stored user exists', () => {
    getStoredUserMock.mockReturnValue({ id: 'user-1' })

    expect(() => typedRoute.beforeLoad()).not.toThrow()
  })

  it('allows navigation when user has completed onboarding', async () => {
    ensureQueryDataMock.mockResolvedValue({ id: 'user-1', app_usage_mode: 'MENTOR' })

    const result = await typedRoute.loader({
      context: { queryClient: { ensureQueryData: ensureQueryDataMock } },
    })

    expect(result).toEqual({ id: 'user-1', app_usage_mode: 'MENTOR' })
    expect(ensureQueryDataMock).toHaveBeenCalledWith({ queryKey: ['me'] })
  })

  it('redirects to onboarding when app_usage_mode is empty', async () => {
    ensureQueryDataMock.mockResolvedValue({ id: 'user-1', app_usage_mode: '' })

    let thrown: unknown
    try {
      await typedRoute.loader({
        context: { queryClient: { ensureQueryData: ensureQueryDataMock } },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual({ to: '/gettingToKnowYou', __redirect: true })
  })

  it('redirects to onboarding when app_usage_mode is undefined', async () => {
    ensureQueryDataMock.mockResolvedValue({ id: 'user-1' })

    let thrown: unknown
    try {
      await typedRoute.loader({
        context: { queryClient: { ensureQueryData: ensureQueryDataMock } },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual({ to: '/gettingToKnowYou', __redirect: true })
  })

  it('does not redirect when user is null (not logged in)', async () => {
    ensureQueryDataMock.mockResolvedValue(null)

    const result = await typedRoute.loader({
      context: { queryClient: { ensureQueryData: ensureQueryDataMock } },
    })

    expect(result).toBeNull()
  })
})
