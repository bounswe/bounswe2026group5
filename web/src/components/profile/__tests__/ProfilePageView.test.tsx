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

import { ProfilePageView } from '../ProfilePageView'

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
    render(
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
          rating: 4.8,
          total_mentee_count: 15,
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

    render(
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
          rating: 4.6,
          total_mentee_count: 22,
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
})
