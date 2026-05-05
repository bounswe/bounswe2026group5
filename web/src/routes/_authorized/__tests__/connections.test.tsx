import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, params, className }: Record<string, unknown>) => (
        <a href={`${to as string}/${(params as Record<string, string>)?.username ?? ''}`} className={className as string}>{children as React.ReactNode}</a>
    ),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Loader2: () => <div data-testid="icon-loader" />,
    UserCircle: () => <div data-testid="icon-user" />,
  }
})

vi.mock('#/lib/utils.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/utils.ts')>()
  return {
    ...actual,
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  }
})

const MOCK_MATCHES = [
  {
    id: 'match-1',
    mentor: {
      id: 'mentor-1',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: '',
      title: 'Software Engineer',
    },
    mentee: {
      id: 'mentee-1',
      username: 'alice_mentee',
      display_name: 'Alice Johnson',
      picture_url: '',
      title: '',
    },
    request_id: 'req-1',
    is_active: true,
  },
  {
    id: 'match-2',
    mentor: {
      id: 'mentor-1b',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: '',
      title: 'Software Engineer',
    },
    mentee: {
      id: 'mentee-2',
      username: 'bob_mentee',
      display_name: 'Bob Williams',
      picture_url: '',
      title: '',
    },
    request_id: 'req-2',
    is_active: true,
  },
  {
    id: 'match-3',
    mentor: {
      id: 'mentor-2',
      username: 'jane_mentor',
      display_name: 'Jane Doe',
      picture_url: '',
      title: 'Data Scientist',
    },
    mentee: {
      id: 'mentee-1',
      username: 'alice_mentee',
      display_name: 'Alice Johnson',
      picture_url: '',
      title: '',
    },
    request_id: 'req-3',
    is_active: false,
  },
]

const mockUseMyMatches = vi.fn()

vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useMyMatches: () => mockUseMyMatches(),
  myMatchesQueryOptions: { queryKey: ['mentorship', 'matches'], queryFn: () => null },
}))

import { ConnectionsPage } from '../connections.index'

function renderWithUser(appUsageMode: 'MENTOR' | 'MENTEE') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['me'], {
    id: '1',
    username: appUsageMode === 'MENTOR' ? 'john_mentor' : 'alice_mentee',
    email: 'test@test.com',
    app_usage_mode: appUsageMode,
    role: 'USER',
    auth_provider: 'LOCAL',
    is_active: true,
    created_at: '2026-01-01',
  })
  return render(
      <QueryClientProvider client={queryClient}>
        <ConnectionsPage />
      </QueryClientProvider>
  )
}

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMyMatches.mockReturnValue({ data: MOCK_MATCHES, isLoading: false })
  })

  // ── Mentee mode ──────────────────────────────────────────────────────────

  it('renders "My Connections" heading in mentee mode', () => {
    renderWithUser('MENTEE')
    expect(screen.getByRole('heading', { name: /My Connections/i })).toBeInTheDocument()
  })

  it('renders mentee-mode description', () => {
    renderWithUser('MENTEE')
    expect(screen.getByText(/Nurture your intellectual growth/i)).toBeInTheDocument()
  })

  it('renders mentor cards for mentee — shows mentor names', () => {
    renderWithUser('MENTEE')
    // alice_mentee has 2 active matches both with john_mentor
    expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0)
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
  })

  it('renders View Profile buttons for each active connection in mentee mode', () => {
    renderWithUser('MENTEE')
    // alice_mentee has 2 active matches (match-1 and match-2)
    const viewButtons = screen.getAllByText(/View Profile/i)
    expect(viewButtons.length).toBe(2)
  })

  it('shows mentor title in mentee mode', () => {
    renderWithUser('MENTEE')
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0)
  })

  // ── Mentor mode ──────────────────────────────────────────────────────────

  it('renders "My Mentees" heading in mentor mode', () => {
    renderWithUser('MENTOR')
    expect(screen.getByRole('heading', { name: /My Mentees/i })).toBeInTheDocument()
  })

  it('renders mentor-mode description', () => {
    renderWithUser('MENTOR')
    expect(screen.getByText(/Manage your mentees and track their progress/i)).toBeInTheDocument()
  })

  it('renders mentee cards for mentor — shows mentee names', () => {
    renderWithUser('MENTOR')
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Williams')).toBeInTheDocument()
  })

  it('renders View Profile buttons for each active connection in mentor mode', () => {
    renderWithUser('MENTOR')
    const viewButtons = screen.getAllByText(/View Profile/i)
    expect(viewButtons.length).toBe(2)
  })

  it('does not show inactive matches', () => {
    renderWithUser('MENTEE')
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
  })

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty state for mentee with no matches', () => {
    mockUseMyMatches.mockReturnValue({ data: [], isLoading: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['me'], {
      id: '99',
      username: 'new_user',
      email: 'new@test.com',
      app_usage_mode: 'MENTEE',
      role: 'USER',
      auth_provider: 'LOCAL',
      is_active: true,
      created_at: '2026-01-01',
    })
    render(
        <QueryClientProvider client={queryClient}>
          <ConnectionsPage />
        </QueryClientProvider>
    )
    expect(screen.getByText(/No mentor connections yet/i)).toBeInTheDocument()
    expect(screen.getByText(/Explore Mentors/i)).toBeInTheDocument()
  })

  it('shows empty state for mentor with no mentees', () => {
    mockUseMyMatches.mockReturnValue({ data: [], isLoading: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['me'], {
      id: '99',
      username: 'new_mentor',
      email: 'new@test.com',
      app_usage_mode: 'MENTOR',
      role: 'USER',
      auth_provider: 'LOCAL',
      is_active: true,
      created_at: '2026-01-01',
    })
    render(
        <QueryClientProvider client={queryClient}>
          <ConnectionsPage />
        </QueryClientProvider>
    )
    expect(screen.getByText(/No mentees yet/i)).toBeInTheDocument()
  })
})