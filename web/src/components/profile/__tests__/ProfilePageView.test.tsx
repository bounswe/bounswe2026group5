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
        { id: 'slot-1', is_booked: false },
        { id: 'slot-2', is_booked: false },
        { id: 'slot-3', is_booked: true },
      ],
    })
  })

  it('hides private mentor fields from non-owners', () => {
    renderWithProviders(
      <ProfilePageView
        profile={{
          isMentor: true,
          username: 'mentor-hidden',
          full_name: 'Hidden Mentor',
          bio: 'Private bio',
          hidden: true,
          picture_url: '',
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

    expect(screen.getByText(/Bio is hidden by the user/i)).toBeInTheDocument()
    expect(screen.getByText(/Title is hidden by the user/i)).toBeInTheDocument()
    expect(screen.getByText(/Rating is hidden by the user/i)).toBeInTheDocument()
    expect(screen.getByText(/Mentee count is hidden by the user/i)).toBeInTheDocument()
    expect(screen.queryByTestId('availability-calendar')).not.toBeInTheDocument()
    expect(mockUseAvailabilitySlots).toHaveBeenCalledWith('mentor-hidden', true)
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
          hidden: false,
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
          hidden: false,
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
          hidden: false,
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
          hidden: false,
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
