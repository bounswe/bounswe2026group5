import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getStoredUserMock } = vi.hoisted(() => ({
  getStoredUserMock: vi.fn(),
}))

vi.mock('#/components/layout/UnauthorizedHeader.tsx', () => ({
  UnauthorizedHeader: () => <div data-testid="unauthorized-header" />,
}))

vi.mock('#/components/layout/UnauthorizedFooter.tsx', () => ({
  UnauthorizedFooter: () => <div data-testid="unauthorized-footer" />,
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  getStoredUser: getStoredUserMock,
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

describe('Unauthorized route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard when user is already authenticated', () => {
    getStoredUserMock.mockReturnValue({ id: 'user-1' })

    let thrown: unknown
    try {
      ;(Route as unknown as { beforeLoad: () => void }).beforeLoad()
    } catch (error) {
      thrown = error
    }

    expect(thrown).toEqual({ to: '/dashboard', __redirect: true })
  })

  it('allows access when no user is stored', () => {
    getStoredUserMock.mockReturnValue(null)

    expect(() => (Route as unknown as { beforeLoad: () => void }).beforeLoad()).not.toThrow()
  })
})
