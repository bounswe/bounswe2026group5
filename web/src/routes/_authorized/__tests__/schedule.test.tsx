import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>()
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

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="icon-left" />,
  ChevronRight: () => <div data-testid="icon-right" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  X: () => <div data-testid="icon-x" />,
  Globe: () => <div data-testid="icon-globe" />,
  Loader2: () => <div data-testid="icon-loader" />,
}))

// Mock upcoming sessions for mentee
const MOCK_MENTEE_SESSIONS = [
  {
    slot_id: 'slot-1',
    mentor: {
      id: 'mentor-1',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: '',
      title: 'Software Engineer',
    },
    slot_date: '2026-04-24',
    slot_start_time: '14:00:00',
    slot_end_time: '15:00:00',
    status: 'BOOKED',
    booked_at: '2026-04-01T10:00:00Z',
  },
  {
    slot_id: 'slot-2',
    mentor: {
      id: 'mentor-1',
      username: 'john_mentor',
      display_name: 'John Smith',
      picture_url: '',
      title: 'Software Engineer',
    },
    slot_date: '2026-04-28',
    slot_start_time: '16:00:00',
    slot_end_time: '17:00:00',
    status: 'BOOKED',
    booked_at: '2026-04-01T10:00:00Z',
  },
]

// Mock booked slots for mentor
const MOCK_MENTOR_SLOTS = [
  {
    id: 'slot-3',
    date: '2026-04-24',
    startTime: '10:00:00',
    endTime: '11:00:00',
    is_booked: true,
    bookedBy: 'mentee_user',
    bookedAt: '2026-04-01T10:00:00Z',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'slot-4',
    date: '2026-04-28',
    startTime: '14:00:00',
    endTime: '15:00:00',
    is_booked: true,
    bookedBy: 'mentee_user2',
    bookedAt: '2026-04-01T10:00:00Z',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
]

vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useUpcomingSessions: () => ({ data: MOCK_MENTEE_SESSIONS, isLoading: false }),
  useMyRequests: () => ({ data: [], isLoading: false }),
  useRespondToRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('#/lib/queries/ProfileTimeSlotQueries.ts', () => ({
  useMentorUpcomingSessions: () => ({
    sessions: MOCK_MENTOR_SLOTS,
    profilesByUsername: {
      mentee_user: { full_name: 'Alice Mentee', picture_url: null },
      mentee_user2: { full_name: 'Bob Mentee', picture_url: null },
    },
    isLoading: false,
  }),
  useAvailabilitySlots: () => ({ data: [], isLoading: false }),
}))

vi.mock('#/lib/utils.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/utils.ts')>()
  return {
    ...actual,
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  }
})
import { SchedulePage } from '../schedule'

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

  it('filters sessions when a calendar day is clicked', () => {
    renderWithUser('MENTEE')

    // Both sessions visible initially
    expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0)

    // Click day 28
    const day28 = screen.getByText('28')
    fireEvent.click(day28)

    // Filter header updates
    expect(screen.getByText(/Sessions for 28 April 2026/i)).toBeInTheDocument()
  })

  it('clears filter when Clear Filter is clicked', () => {
    renderWithUser('MENTEE')

    const day28 = screen.getByText('28')
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