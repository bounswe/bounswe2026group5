import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthorizedHeader } from '../AuthorizedHeader'

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to, className }: Record<string, unknown>) => <a href={to as string} className={className as string}>{children as React.ReactNode}</a>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
  }
})

// Mock queries — header uses meQueryOptions and useProfile
vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  meQueryOptions: { queryKey: ['me'], queryFn: () => null },
  logout: vi.fn(),
}))

vi.mock('#/lib/queries/ProfileQueries.ts', () => ({
  useProfile: () => ({ data: null }),
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
  )
}

describe('AuthorizedHeader Component', () => {
  it('renders the branding text', () => {
    renderWithClient(<AuthorizedHeader />)
    expect(screen.getByText('Neighborship')).toBeInTheDocument()
  })

  it('renders the navigation links', () => {
    renderWithClient(<AuthorizedHeader />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Connections')).toBeInTheDocument()
  })

  it('renders the Sign out button', () => {
    renderWithClient(<AuthorizedHeader />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('renders user initials from username when no profile', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['me'], {
      id: '1',
      username: 'kazanciinan7',
      email: 'test@test.com',
      app_usage_mode: 'MENTOR',
    })
    render(
        <QueryClientProvider client={queryClient}>
          <AuthorizedHeader />
        </QueryClientProvider>
    )
    expect(screen.getByText('KA')).toBeInTheDocument()
  })
})