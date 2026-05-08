import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAvailabilitySlots } = vi.hoisted(() => ({
  mockUseAvailabilitySlots: vi.fn(),
}))

vi.mock('#/lib/queries/ProfileTimeSlotQueries.ts', () => ({
  useAvailabilitySlots: (username: string, isMentor: boolean) =>
    mockUseAvailabilitySlots(username, isMentor),
}))

vi.mock('#/components/profile/AvailabilityCalendar.tsx', () => ({
  AvailabilityCalendar: ({ username }: { username: string }) => (
    <div data-testid="availability-calendar">Calendar for {username}</div>
  ),
}))

vi.mock('#/components/profile/EditProfileModal.tsx', () => ({
  EditProfileModal: ({ mode }: { mode: 'MENTOR' | 'MENTEE' }) => (
    <div data-testid="edit-profile-modal">Edit modal in {mode} mode</div>
  ),
}))

vi.mock('#/lib/queries/ProfileQueries.ts', () => ({
  useMentorReviews: () => ({
    data: { count: 0, results: [] },
    isLoading: false,
  }),
}))

import { ProfilePageView } from '../ProfilePageView'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ProfilePageView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAvailabilitySlots.mockReturnValue({
      data: [
        { id: 'slot-1', status: 'AVAILABLE' },
        { id: 'slot-2', status: 'AVAILABLE' },
        { id: 'slot-3', status: 'BOOKED' },
      ],
    })
  })

  it('shows initials and hides picture when show_initials_only is true', () => {
    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: true,
          username: 'mentor-anon',
          full_name: 'MA', // initials from backend
          bio: 'Private bio',
          show_initials_only: true,
          picture_url: 'https://example.com/pic.jpg',
          title: 'Senior Mentor',
          skills: ['React'],
          average_rating: 4.8,
          total_mentee_count: 15,
          app_usage_mode: 'MENTOR',
        }}
        isOwner={false}
        isAuthenticatedViewer={true}
      />,
    )

    expect(screen.getByText('MA')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Senior Mentor')).toBeInTheDocument()
    expect(screen.getByTestId('availability-calendar')).toBeInTheDocument()
  })

  it('shows mentor snapshot/calendar and opens edit modal for owner', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: true,
          username: 'mentor-public',
          full_name: 'Public Mentor',
          bio: 'I help with systems design.',
          show_initials_only: false,
          picture_url: '',
          title: 'Principal Engineer',
          skills: ['Systems Design', 'TypeScript'],
          average_rating: 4.6,
          total_mentee_count: 22,
          app_usage_mode: 'MENTOR',
        }}
        isOwner={true}
        isAuthenticatedViewer={true}
      />,
    )

    expect(screen.getByText('Open Slots')).toBeInTheDocument()
    expect(screen.getByTestId('availability-calendar')).toHaveTextContent('Calendar for mentor-public')

    await user.click(screen.getByRole('button', { name: /Edit profile/i }))

    expect(screen.getByTestId('edit-profile-modal')).toHaveTextContent('Edit modal in MENTOR mode')
  })

  it('displays Admin badge for admin users', () => {
    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: false,
          username: 'admin-user',
          full_name: 'System Admin',
          bio: 'I manage the platform.',
          show_initials_only: false,
          picture_url: '',
          skills: [],
          app_usage_mode: 'ADMIN',
        }}
        isOwner={false}
        isAuthenticatedViewer={true}
      />,
    )

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByText('Mentee')).not.toBeInTheDocument()
    expect(screen.queryByText('Mentor')).not.toBeInTheDocument()
  })

  it('shows Report button for other users when authenticated', () => {
    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: false,
          username: 'other-user',
          full_name: 'Other User',
          bio: 'Hello world',
          show_initials_only: false,
          picture_url: '',
          skills: [],
          app_usage_mode: 'MENTEE',
        }}
        isOwner={false}
        isAuthenticatedViewer={true}
      />,
    )

    expect(screen.getByRole('button', { name: /Report/i })).toBeInTheDocument()
  })

  it('hides Report button when viewing own profile', () => {
    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: false,
          username: 'my-user',
          full_name: 'My User',
          bio: 'My bio',
          show_initials_only: false,
          picture_url: '',
          skills: [],
          app_usage_mode: 'MENTEE',
        }}
        isOwner={true}
        isAuthenticatedViewer={true}
      />,
    )

    expect(screen.queryByRole('button', { name: /Report/i })).not.toBeInTheDocument()
  })
})
