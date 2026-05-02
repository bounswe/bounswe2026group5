import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SchedulePage } from '../schedule'

const { mockUseMeetingSessions } = vi.hoisted(() => ({
  mockUseMeetingSessions: vi.fn(),
}))

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, className }: { children: React.ReactNode, to: string, className?: string }) => (
        <a href={to} className={className}>{children}</a>
    ),
  }
})

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="icon-left" />,
  ChevronRight: () => <div data-testid="icon-right" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  X: () => <div data-testid="icon-x" />,
  Globe: () => <div data-testid="icon-globe" />,
  Loader2: () => <div data-testid="icon-loader" />,
}))

// Mock canonical meeting sessions for mentee
const MOCK_MENTEE_MEETING_SESSIONS = [
  {
    session_id: 'session-1',
    match_id: 'match-1',
    mentor: {
      id: 'mentor-1',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: '',
      title: 'Software Engineer',
    },
    mentee: {
      id: 'mentee-me',
      username: 'testuser',
      display_name: 'Test User',
      picture_url: '',
      title: '',
    },
    source_slot_id: 'slot-1',
    scheduled_start_at: '2026-04-24T14:00:00',
    scheduled_end_at: '2026-04-24T15:00:00',
    status: 'SCHEDULED',
    display_status: 'SCHEDULED',
    my_role: 'MENTEE',
    allowed_actions: [],
    canceled_by_role: null,
    cancel_reason: '',
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
    {
    session_id: 'session-2',
    match_id: 'match-2',
    mentor: {
      id: 'mentor-1',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: 'https://example.com/pic.jpg',
      title: 'Software Engineer',
    },
    mentee: {
      id: 'mentee-me',
      username: 'testuser',
      display_name: 'Test User',
      picture_url: '',
      title: '',
    },
    source_slot_id: 'slot-2',
    scheduled_start_at: '2026-04-28T16:00:00',
    scheduled_end_at: '2026-04-28T17:00:00',
    status: 'COMPLETED',
    display_status: 'COMPLETED',
    my_role: 'MENTEE',
    allowed_actions: [],
    canceled_by_role: null,
    cancel_reason: '',
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
]

// Mock canonical meeting sessions for mentor
const MOCK_MENTOR_MEETING_SESSIONS = [
  {
    session_id: 'session-3',
    match_id: 'match-3',
    mentor: {
      id: 'mentor-me',
      username: 'testuser',
      display_name: 'Test Mentor',
      picture_url: '',
      title: '',
    },
    mentee: {
      id: 'mentee-1',
      username: 'mentee_user',
      display_name: 'Alice Mentee',
      picture_url: 'https://example.com/mentee.jpg',
      title: 'Graduate Student',
    },
    source_slot_id: 'slot-3',
    scheduled_start_at: '2026-04-24T10:00:00',
    scheduled_end_at: '2026-04-24T11:00:00',
    status: 'SCHEDULED',
    display_status: 'SCHEDULED',
    my_role: 'MENTOR',
    allowed_actions: [],
    canceled_by_role: null,
    cancel_reason: '',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
  {
    session_id: 'session-4',
    match_id: 'match-4',
    mentor: {
      id: 'mentor-me',
      username: 'testuser',
      display_name: 'Test Mentor',
      picture_url: '',
      title: '',
    },
    mentee: {
      id: 'mentee-2',
      username: 'mentee_user2',
      display_name: 'Bob Mentee',
      picture_url: '',
      title: '',
    },
    source_slot_id: 'slot-4',
    scheduled_start_at: '2026-04-28T14:00:00',
    scheduled_end_at: '2026-04-28T15:00:00',
    status: 'COMPLETED',
    display_status: 'COMPLETED',
    my_role: 'MENTOR',
    allowed_actions: [],
    canceled_by_role: null,
    cancel_reason: '',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
]

vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useMeetingSessions: (params?: { role?: 'mentor' | 'mentee' | 'all' }) => mockUseMeetingSessions(params),
  useMyRequests: () => ({ data: [], isLoading: false }),
  useRespondToRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('#/lib/utils.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/utils.ts')>()
  return {
    ...actual,
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  }
})

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
        <SchedulePage />
      </QueryClientProvider>
  )
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMeetingSessions.mockImplementation((params?: { role?: 'mentor' | 'mentee' | 'all' }) => ({
      data: params?.role === 'mentor' ? MOCK_MENTOR_MEETING_SESSIONS : MOCK_MENTEE_MEETING_SESSIONS,
      isLoading: false,
    }))
  })

  it('shows a loading indicator while sessions are being fetched', () => {
    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: true })

    renderWithUser('MENTEE')

    expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
  })

  it('shows an empty state when there are no sessions for the selected role', () => {
    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: false })

    renderWithUser('MENTEE')

    expect(screen.getByText(/No sessions scheduled for this selection/i)).toBeInTheDocument()
  })

  it('renders the Mentee Learning Schedule for mentee', () => {
    renderWithUser('MENTEE')
    expect(screen.getByRole('heading', { name: /Learning Schedule/i })).toBeInTheDocument()
    expect(screen.getByText(/Keep track of your upcoming classes/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Teaching Schedule/i })).not.toBeInTheDocument()
  })

  it('renders mentor name in mentee schedule table', () => {
    renderWithUser('MENTEE')
    expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0)
  })

  it('renders the Mentor Teaching Schedule for mentor', () => {
    renderWithUser('MENTOR')
    expect(screen.getByRole('heading', { name: /Teaching Schedule/i })).toBeInTheDocument()
    expect(screen.getByText(/Manage your upcoming tutoring sessions/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Learning Schedule/i })).not.toBeInTheDocument()
  })

  it('renders mentee names in mentor schedule table', () => {
    renderWithUser('MENTOR')
    expect(screen.getByText('Alice Mentee')).toBeInTheDocument()
    expect(screen.getByText('Bob Mentee')).toBeInTheDocument()
  })

  it('renders peer titles and pictures when available', () => {
    renderWithUser('MENTEE')
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0)
    const img = screen.getByAltText('John Smith')
    expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg')
  })

  it('renders status badges correctly', () => {
    renderWithUser('MENTOR')
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
  })

  it('filters sessions when a calendar day is clicked', () => {
    renderWithUser('MENTEE')

    // Both sessions visible initially
    expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0)

    // Click day 28
    const day28 = screen.getAllByText('28')[0]
    fireEvent.click(day28)

    // Filter header updates
    expect(screen.getByText(/Sessions for 28 April 2026/i)).toBeInTheDocument()

    // Click day 28 again to deselect
    fireEvent.click(day28)
    expect(screen.getByText('All Sessions')).toBeInTheDocument()
  })

  it('clears filter when Clear Filter is clicked', () => {
    renderWithUser('MENTEE')

    const day28 = screen.getAllByText('28')[0]
    fireEvent.click(day28)
    expect(screen.getByText(/Sessions for 28 April 2026/i)).toBeInTheDocument()

    const clearButton = screen.getByRole('button', { name: /Clear Filter/i })
    fireEvent.click(clearButton)
    expect(screen.getByText('All Sessions')).toBeInTheDocument()
  })

  it('does not render MentorAvailabilityModal', () => {
    renderWithUser('MENTOR')
    expect(screen.queryByText('Mocked Modal')).not.toBeInTheDocument()
  })
})