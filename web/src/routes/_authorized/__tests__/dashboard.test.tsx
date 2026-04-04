import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, className }: any) => (
        <a href={to} className={className}>{children}</a>
    ),
  }
})

// Mock mentorship queries used in MentorDashboardView
vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useMyRequests: () => ({ data: [], isLoading: false }),
  useRespondToRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { DashboardHome } from '../dashboard'

function renderWithUser(appUsageMode: 'MENTOR' | 'MENTEE') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['me'], {
    id: '1',
    username: 'testuser',
    email: 'test@test.com',
    app_usage_mode: appUsageMode,
    role: 'USER',
    auth_provider: 'LOCAL',
    is_active: true,
    created_at: '2026-01-01',
  })
  return render(
      <QueryClientProvider client={queryClient}>
        <DashboardHome />
      </QueryClientProvider>
  )
}

describe('Dashboard Component Routing & Role Variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Mentee Dashboard when app_usage_mode is MENTEE', () => {
    renderWithUser('MENTEE')
    expect(screen.getByRole('heading', { name: /Mentee Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sent Requests/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Incoming Requests/i })).not.toBeInTheDocument()
  })

  it('renders the Mentor Dashboard when app_usage_mode is MENTOR', () => {
    renderWithUser('MENTOR')
    expect(screen.getByRole('heading', { name: /Mentor Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Incoming Requests/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Sent Requests/i })).not.toBeInTheDocument()
  })

  it('falls back to Mentee Dashboard when app_usage_mode is not set', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['me'], null)
    render(
        <QueryClientProvider client={queryClient}>
          <DashboardHome />
        </QueryClientProvider>
    )
    expect(screen.getByRole('heading', { name: /Mentee Dashboard/i })).toBeInTheDocument()
  })
})