// web/src/routes/_authorized/__tests__/dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseSearch } = vi.hoisted(() => {
  return { mockUseSearch: vi.fn() }
})

// Block routeTree.gen.ts and router.tsx from executing — they call
// .update() and ._addFileChildren() on real Route objects which break
// when any single route file is mocked.
vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

// Also mock the query that dashboard.tsx calls at the top level
vi.mock('#/lib/queries/Authqueries', () => ({
  meQueryOptions: { queryKey: ['me'], queryFn: () => null },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({ data: null, isSuccess: false }),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      // Return a fake Route object with useSearch attached
      useSearch: mockUseSearch,
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, className }: any) => (
        <a href={to} className={className}>{children}</a>
    ),
  }
})

import { DashboardHome } from '../dashboard'

describe('Dashboard Component Routing & Role Variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Mentee Dashboard by default', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentee' })
    render(<DashboardHome />)

    expect(screen.getByRole('heading', { name: /Mentee Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sent Requests/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Incoming Requests/i })).not.toBeInTheDocument()
  })

  it('renders the Mentor Dashboard when URL specifies mentor mode', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentor' })
    render(<DashboardHome />)

    expect(screen.getByRole('heading', { name: /Mentor Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Incoming Requests/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Sent Requests/i })).not.toBeInTheDocument()
  })
})