import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUseMyRequests,
  mockUseMeetingSessions,
  mockMutate,
  toastSuccessMock,
  toastWarningMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  mockUseMyRequests: vi.fn(),
  mockUseMeetingSessions: vi.fn(),
  mockMutate: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, params, className }: Record<string, unknown>) => (
      <a href={`${to as string}/${(params as Record<string, string>)?.username ?? ''}`} className={className as string}>
        {children as React.ReactNode}
      </a>
    ),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    warning: toastWarningMock,
    error: toastErrorMock,
  },
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    ArrowRight: () => <span data-testid="icon-arrow-right" />,
    CalendarDays: () => <span data-testid="icon-calendar-days" />,
    Check: () => <span data-testid="icon-check" />,
    CheckCircle2: () => <span data-testid="icon-check-circle" />,
    Clock: () => <span data-testid="icon-clock" />,
    Loader2: () => <span data-testid="icon-loader" />,
    XCircle: () => <span data-testid="icon-x-circle" />,
    X: () => <span data-testid="icon-x" />,
  }
})

vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useMyRequests: () => mockUseMyRequests(),
  useMeetingSessions: (params: Record<string, unknown>) => mockUseMeetingSessions(params),
  useRespondToRequest: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  matchFeedbackQueryOptions: (matchId: string) => ({
    queryKey: ['mentorship', 'matches', matchId, 'feedback'],
    queryFn: async () => [],
    staleTime: Infinity,
  }),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  meQueryOptions: {
    queryKey: ['me'],
    queryFn: async () => null,
    staleTime: Infinity,
  },
}))

import { DashboardHome } from '../dashboard'

function renderDashboard(appUsageMode: 'MENTOR' | 'MENTEE', username: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(['me'], {
    id: 'user-1',
    username,
    email: `${username}@example.com`,
    role: 'USER',
    auth_provider: 'LOCAL',
    app_usage_mode: appUsageMode,
    is_active: true,
    created_at: '2026-04-01T10:00:00Z',
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardHome />
    </QueryClientProvider>,
  )
}

describe('DashboardHome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutate.mockImplementation((_payload, callbacks) => {
      callbacks?.onSuccess?.()
    })
  })

  it('shows mentee-specific content and only displays pending sent requests for current user', () => {
    mockUseMeetingSessions.mockImplementation(({ role }: { role: 'mentor' | 'mentee' }) => ({
      data:
        role === 'mentee'
          ? [
              {
                session_id: 'session-1',
                match_id: 'match-1',
                mentor: {
                  username: 'mentor-rita',
                  display_name: 'Rita Mentor',
                  picture_url: '',
                  title: 'Data Scientist',
                },
                scheduled_start_at: '2026-04-28T14:00:00Z',
                scheduled_end_at: '2026-04-28T15:00:00Z',
                display_status: 'SCHEDULED',
              },
            ]
          : [],
      isLoading: false,
    }))

    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-1',
          mentor: {
            username: 'mentor-rita',
            display_name: 'Rita Mentor',
            picture_url: '',
            title: 'Data Scientist',
          },
          mentee: {
            username: 'mentee-sam',
            display_name: 'Sam Mentee',
            picture_url: '',
            title: '',
          },
          status: 'PENDING',
          slot_date: '2026-04-28',
          slot_start_time: '14:00:00',
          slot_end_time: '15:00:00',
          cover_letter: 'Would love to learn with you.',
        },
        {
          id: 'req-2',
          mentor: {
            username: 'mentor-other',
            display_name: 'Other Mentor',
            picture_url: '',
            title: 'Engineer',
          },
          mentee: {
            username: 'different-user',
            display_name: 'Different User',
            picture_url: '',
            title: '',
          },
          status: 'PENDING',
          slot_date: '2026-04-29',
          slot_start_time: '10:00:00',
          slot_end_time: '11:00:00',
          cover_letter: '',
        },
        {
          id: 'req-3',
          mentor: {
            username: 'mentor-accepted',
            display_name: 'Accepted Mentor',
            picture_url: '',
            title: 'Teacher',
          },
          mentee: {
            username: 'mentee-sam',
            display_name: 'Sam Mentee',
            picture_url: '',
            title: '',
          },
          status: 'ACCEPTED',
          slot_date: '2026-04-29',
          slot_start_time: '10:00:00',
          slot_end_time: '11:00:00',
          cover_letter: '',
        },
      ],
    })

    renderDashboard('MENTEE', 'mentee-sam')

    expect(screen.getByRole('heading', { name: /Mentee Dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/Track your learning goals/i)).toBeInTheDocument()
    expect(screen.getByText('Session with Rita Mentor')).toBeInTheDocument()
    expect(screen.getByText('To: Rita Mentor')).toBeInTheDocument()
    expect(screen.queryByText('To: Other Mentor')).not.toBeInTheDocument()
    expect(screen.queryByText('To: Accepted Mentor')).not.toBeInTheDocument()
  })

  it('accepts a mentor request and transitions request badge state', async () => {
    const user = userEvent.setup()

    mockUseMeetingSessions.mockImplementation(() => ({ data: [], isLoading: false }))
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-mentor-1',
          mentor: {
            username: 'mentor-rita',
            display_name: 'Rita Mentor',
            picture_url: '',
            title: 'Data Scientist',
          },
          mentee: {
            username: 'mentee-kai',
            display_name: 'Kai Learner',
            picture_url: '',
            title: '',
          },
          status: 'PENDING',
          slot_date: '2026-05-02',
          slot_start_time: '13:00:00',
          slot_end_time: '14:00:00',
          cover_letter: 'Looking forward to learning Python.',
        },
      ],
    })

    renderDashboard('MENTOR', 'mentor-rita')

    await user.click(screen.getByRole('button', { name: /Accept/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { requestId: 'req-mentor-1', action: 'accept' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('ACCEPTED')).toBeInTheDocument()
    })

    expect(toastSuccessMock).toHaveBeenCalledWith('Request accepted',
      expect.objectContaining({
        description: expect.stringMatching(/session is confirmed/i),
      }),
    )
    expect(toastWarningMock).not.toHaveBeenCalled()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('rejects a mentor request and shows warning toast with REJECTED status', async () => {
    const user = userEvent.setup()

    mockMutate.mockImplementation((_payload, callbacks) => {
      callbacks?.onSuccess?.()
    })

    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: false })
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-mentor-2',
          mentor: {
            username: 'mentor-rita',
            display_name: 'Rita Mentor',
            picture_url: '',
            title: 'Data Scientist',
          },
          mentee: {
            username: 'mentee-lina',
            display_name: 'Lina Learner',
            picture_url: '',
            title: '',
          },
          status: 'PENDING',
          slot_date: '2026-05-03',
          slot_start_time: '13:00:00',
          slot_end_time: '14:00:00',
          cover_letter: '',
        },
      ],
    })

    renderDashboard('MENTOR', 'mentor-rita')

    await user.click(screen.getByRole('button', { name: /Decline/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { requestId: 'req-mentor-2', action: 'reject' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('REJECTED')).toBeInTheDocument()
    })

    expect(toastWarningMock).toHaveBeenCalledWith(
      'Request declined',
      expect.objectContaining({
        description: expect.stringMatching(/mentee has been notified/i),
      }),
    )
  })

  it('shows an error toast when request response fails', async () => {
    const user = userEvent.setup()

    mockMutate.mockImplementation((_payload, callbacks) => {
      callbacks?.onError?.({ message: 'Server is unavailable' })
    })

    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: false })
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-mentor-3',
          mentor: {
            username: 'mentor-rita',
            display_name: 'Rita Mentor',
            picture_url: '',
            title: 'Data Scientist',
          },
          mentee: {
            username: 'mentee-kaan',
            display_name: 'Kaan Learner',
            picture_url: '',
            title: '',
          },
          status: 'PENDING',
          slot_date: '2026-05-04',
          slot_start_time: '15:00:00',
          slot_end_time: '16:00:00',
          cover_letter: 'Please help me with OOP.',
        },
      ],
    })

    renderDashboard('MENTOR', 'mentor-rita')

    await user.click(screen.getByRole('button', { name: /Accept/i }))

    expect(toastErrorMock).toHaveBeenCalledWith('Server is unavailable')
  })

  it('shows the "View all requests" button when more than three pending requests exist', () => {
    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: false })
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'req-1',
          mentor: { username: 'mentor-rita', display_name: 'Rita Mentor', picture_url: '', title: 'Data Scientist' },
          mentee: { username: 'mentee-1', display_name: 'A', picture_url: '', title: '' },
          status: 'PENDING',
          slot_date: '2026-05-01',
          slot_start_time: '09:00:00',
          slot_end_time: '10:00:00',
          cover_letter: '',
        },
        {
          id: 'req-2',
          mentor: { username: 'mentor-rita', display_name: 'Rita Mentor', picture_url: '', title: 'Data Scientist' },
          mentee: { username: 'mentee-2', display_name: 'B', picture_url: '', title: '' },
          status: 'PENDING',
          slot_date: '2026-05-02',
          slot_start_time: '09:00:00',
          slot_end_time: '10:00:00',
          cover_letter: '',
        },
        {
          id: 'req-3',
          mentor: { username: 'mentor-rita', display_name: 'Rita Mentor', picture_url: '', title: 'Data Scientist' },
          mentee: { username: 'mentee-3', display_name: 'C', picture_url: '', title: '' },
          status: 'PENDING',
          slot_date: '2026-05-03',
          slot_start_time: '09:00:00',
          slot_end_time: '10:00:00',
          cover_letter: '',
        },
        {
          id: 'req-4',
          mentor: { username: 'mentor-rita', display_name: 'Rita Mentor', picture_url: '', title: 'Data Scientist' },
          mentee: { username: 'mentee-4', display_name: 'D', picture_url: '', title: '' },
          status: 'PENDING',
          slot_date: '2026-05-04',
          slot_start_time: '09:00:00',
          slot_end_time: '10:00:00',
          cover_letter: '',
        },
      ],
    })

    renderDashboard('MENTOR', 'mentor-rita')

    expect(screen.getByRole('button', { name: /View all 4 requests/i })).toBeInTheDocument()
  })

  it('renders loading indicators while mentor dashboard queries are in flight', () => {
    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: true })
    mockUseMyRequests.mockReturnValue({ data: [], isLoading: true })

    renderDashboard('MENTOR', 'mentor-rita')

    expect(screen.getAllByTestId('icon-loader').length).toBeGreaterThan(0)
  })

  it('renders empty states when mentor has no sessions and no requests', () => {
    mockUseMeetingSessions.mockReturnValue({ data: [], isLoading: false })
    mockUseMyRequests.mockReturnValue({ data: [], isLoading: false })

    renderDashboard('MENTOR', 'mentor-rita')

    expect(screen.getAllByText(/No upcoming sessions in the next 7 days/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/No pending requests right now/i).length).toBeGreaterThan(0)
  })
})
