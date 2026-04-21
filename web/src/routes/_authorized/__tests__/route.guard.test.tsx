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

describe('Authorized route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when there is no stored user', () => {
    getStoredUserMock.mockReturnValue(null)

    let thrown: unknown
    try {
      ;(Route as unknown as { beforeLoad: () => void }).beforeLoad()
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual({ to: '/login', __redirect: true })
  })

  it('allows navigation when stored user exists', () => {
    getStoredUserMock.mockReturnValue({ id: 'user-1' })

    expect(() => (Route as unknown as { beforeLoad: () => void }).beforeLoad()).not.toThrow()
  })

  it('ensures current user query data in loader', async () => {
    await (Route as unknown as { loader: (args: Record<string, unknown>) => Promise<void> }).loader({
      context: {
        queryClient: {
          ensureQueryData: ensureQueryDataMock,
        },
      },
    })

    expect(ensureQueryDataMock).toHaveBeenCalledWith({ queryKey: ['me'] })
  })
})
