import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAdminUsers,
  mockAdminReports,
  mockToggleBan,
  mockResolveReport,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  mockAdminUsers: vi.fn(),
  mockAdminReports: vi.fn(),
  mockToggleBan: vi.fn(),
  mockResolveReport: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('#/lib/queries/AdminQueries.ts', () => ({
  adminUsersQueryOptions: (page: number) => ({
    queryKey: ['admin', 'users', page],
    queryFn: () => mockAdminUsers(page),
  }),
  adminReportsQueryOptions: (page: number) => ({
    queryKey: ['admin', 'reports', page],
    queryFn: () => mockAdminReports(page),
  }),
  useToggleBan: () => ({
    mutate: mockToggleBan,
    isPending: false,
  }),
  useResolveReport: () => ({
    mutate: mockResolveReport,
    isPending: false,
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    redirect: vi.fn(),
  }
})

vi.mock('#/routeTree.gen.ts', () => ({
  routeTree: {},
}))

vi.mock('#/router.tsx', () => ({
  router: {
    update: vi.fn(),
  },
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    ShieldCheck: () => <span data-testid="icon-shield-check" />,
    ShieldAlert: () => <span data-testid="icon-shield-alert" />,
    Users: () => <span data-testid="icon-users" />,
    Search: () => <span data-testid="icon-search" />,
    Ban: () => <span data-testid="icon-ban" />,
    CheckCircle2: () => <span data-testid="icon-check-circle" />,
    Clock: () => <span data-testid="icon-clock" />,
    Eye: () => <span data-testid="icon-eye" />,
    Loader2: () => <span data-testid="icon-loader" />,
    XCircle: () => <span data-testid="icon-x-circle" />,
    AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  }
})

import { AdminModerationPage } from '../admin-moderation'

function renderAdminModeration() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminModerationPage />
    </QueryClientProvider>
  )
}

describe('AdminModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminUsers.mockReturnValue({
      count: 1,
      results: [
        {
          id: 'user-1',
          username: 'test-user',
          email: 'test@example.com',
          role: 'MENTEE',
          is_banned: false,
          created_at: '2026-05-01T10:00:00Z',
        },
      ],
    })
    mockAdminReports.mockReturnValue({
      count: 1,
      results: [
        {
          id: 'report-1',
          submitted_by: { username: 'reporter' },
          reported_user: { username: 'test-user' },
          reason: 'SPAM',
          description: 'They are spamming',
          status: 'OPEN',
          created_at: '2026-05-02T10:00:00Z',
        },
      ],
    })
  })

  it('renders the users tab by default and displays user list', async () => {
    renderAdminModeration()

    expect(screen.getByText('Admin Moderation')).toBeInTheDocument()
    expect(screen.getByText('User Management')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('test-user')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('switches to reports tab and displays reports', async () => {
    const user = userEvent.setup()
    renderAdminModeration()

    await user.click(screen.getByText('Reports'))

    await waitFor(() => {
      expect(screen.getByText('reporter')).toBeInTheDocument()
      expect(screen.getByText(/Spam/i)).toBeInTheDocument()
    })
  })

  it('filters users by search query', async () => {
    const user = userEvent.setup()
    mockAdminUsers.mockReturnValue({
      count: 2,
      results: [
        { id: '1', username: 'alice', email: 'alice@a.com', role: 'MENTOR', is_banned: false, created_at: '2026-01-01' },
        { id: '2', username: 'bob', email: 'bob@b.com', role: 'MENTEE', is_banned: false, created_at: '2026-01-01' },
      ],
    })
    
    renderAdminModeration()

    const searchInput = screen.getByPlaceholderText(/Search by email or username/i)
    await user.type(searchInput, 'alice')

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.queryByText('bob')).not.toBeInTheDocument()
  })

  it('opens ban confirmation dialog and executes ban', async () => {
    const user = userEvent.setup()
    mockToggleBan.mockImplementation(({ userId, isBanned }, { onSuccess }) => {
      onSuccess()
    })

    renderAdminModeration()

    await waitFor(() => expect(screen.getByText('test-user')).toBeInTheDocument())
    
    await user.click(screen.getByRole('button', { name: /Ban/i }))
    
    expect(screen.getByText(/Are you sure you want to ban test-user/i)).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: /Ban User/i }))
    
    expect(mockToggleBan).toHaveBeenCalledWith(
      { userId: 'user-1', isBanned: true },
      expect.any(Object)
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('test-user has been banned')
  })

  it('opens report review dialog and resolves report', async () => {
    const user = userEvent.setup()
    mockResolveReport.mockImplementation(({ reportId, status }, { onSuccess }) => {
      onSuccess()
    })

    renderAdminModeration()
    await user.click(screen.getByText('Reports'))

    await waitFor(() => expect(screen.getByText('reporter')).toBeInTheDocument())
    
    await user.click(screen.getByRole('button', { name: /Review/i }))
    
    expect(screen.getByText('Review Report')).toBeInTheDocument()
    expect(screen.getByText(/"They are spamming"/i)).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: /Resolve/i }))
    
    expect(mockResolveReport).toHaveBeenCalledWith(
      { reportId: 'report-1', status: 'RESOLVED', resolutionNote: '' },
      expect.any(Object)
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Report resolved')
  })
})
