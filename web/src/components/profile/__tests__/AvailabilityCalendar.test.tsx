import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Hoisted mocks ----

const {
  mockUseAvailabilitySlots,
  mockUseMyMatches,
  mockUseMyRequests,
  mockUseSendMentorshipRequest,
  mockUseCancelSession,
  mockUseBookSlot,
  mockUseCreateSlot,
  mockUseDeleteSlot,
  mockMeQuery,
} = vi.hoisted(() => ({
  mockUseAvailabilitySlots: vi.fn(),
  mockUseMyMatches: vi.fn(),
  mockUseMyRequests: vi.fn(),
  mockUseSendMentorshipRequest: vi.fn(),
  mockUseCancelSession: vi.fn(),
  mockUseBookSlot: vi.fn(),
  mockUseCreateSlot: vi.fn(),
  mockUseDeleteSlot: vi.fn(),
  mockMeQuery: vi.fn(),
}))

vi.mock('#/lib/queries/ProfileTimeSlotQueries.ts', () => ({
  useAvailabilitySlots: (...args: unknown[]) => mockUseAvailabilitySlots(...args),
  useBookSlot: (...args: unknown[]) => mockUseBookSlot(...args),
  useCreateSlot: (...args: unknown[]) => mockUseCreateSlot(...args),
  useDeleteSlot: (...args: unknown[]) => mockUseDeleteSlot(...args),
}))

vi.mock('#/lib/queries/MentorshipQueries.ts', () => ({
  useMyMatches: () => mockUseMyMatches(),
  useMyRequests: () => mockUseMyRequests(),
  useSendMentorshipRequest: () => mockUseSendMentorshipRequest(),
  useCancelSession: () => mockUseCancelSession(),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  meQueryOptions: { queryKey: ['me'], queryFn: () => null },
}))

vi.mock('lucide-react', () => ({
  CalendarDays: () => <div data-testid="icon-calendar" />,
  ChevronLeft: () => <div data-testid="icon-left" />,
  ChevronRight: () => <div data-testid="icon-right" />,
  Loader2: () => <div data-testid="icon-loader" />,
  X: () => <div data-testid="icon-x" />,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { AvailabilityCalendar } from '../AvailabilityCalendar'

// ---- Helpers ----

function nextWeekday(dayOfWeek: number): string {
  const d = new Date()
  const diff = ((dayOfWeek - d.getDay()) + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const futureDate = '2030-01-09' // Wednesday of the mocked week (2030-01-07 Monday)

function makeSlot(overrides = {}) {
  return {
    id: 'slot-1',
    date: futureDate,
    startTime: '10:00:00',
    endTime: '11:00:00',
    is_booked: false,
    status: 'AVAILABLE',
    bookedBy: null,
    bookedAt: null,
    sessionId: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

function renderCalendar(props = {}) {
  const defaults = { username: 'test-mentor', isOwner: false, isAuthenticated: true }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AvailabilityCalendar {...defaults} {...props} />
    </QueryClientProvider>,
  )
}

// ---- Tests ----

describe('AvailabilityCalendar — Pending Slot Display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-07T00:00:00Z')) // fixed Monday far in the future
    vi.clearAllMocks()

    mockUseMyMatches.mockReturnValue({ data: [] })
    mockUseMyRequests.mockReturnValue({ data: [] })
    mockUseSendMentorshipRequest.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseCancelSession.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseBookSlot.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseCreateSlot.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseDeleteSlot.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Requested" label on a slot that has a pending request (mentee view)', () => {
    const slot = makeSlot()
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({
      data: [{ slot_id: 'slot-1', status: 'PENDING', mentor: { username: 'test-mentor' } }],
    })

    renderCalendar({ isOwner: false, isAuthenticated: true })

    expect(screen.getByText('Requested')).toBeInTheDocument()
    expect(screen.queryByText('Book')).not.toBeInTheDocument()
  })

  it('shows "Pending" label on a slot that has a pending request (mentor/owner view)', () => {
    const slot = makeSlot()
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({
      data: [{ slot_id: 'slot-1', status: 'PENDING', mentor: { username: 'test-mentor' } }],
    })

    renderCalendar({ isOwner: true, isAuthenticated: true })

    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('does not open booking modal when clicking a pending slot', () => {
    const slot = makeSlot()
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({
      data: [{ slot_id: 'slot-1', status: 'PENDING', mentor: { username: 'test-mentor' } }],
    })

    renderCalendar({ isOwner: false, isAuthenticated: true })

    const requestedCell = screen.getByText('Requested').closest('div')!
    fireEvent.click(requestedCell)

    // Booking modal should NOT appear
    expect(screen.queryByText('Send Mentorship Request')).not.toBeInTheDocument()
    expect(screen.queryByText('Book this slot')).not.toBeInTheDocument()
  })

  it('shows "Book" on available slots that have no pending request', () => {
    const slot = makeSlot({ id: 'slot-available' })
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({ data: [] })

    renderCalendar({ isOwner: false, isAuthenticated: true })

    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.queryByText('Requested')).not.toBeInTheDocument()
  })

  it('does not mark slot as pending when request status is not PENDING', () => {
    const slot = makeSlot()
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({
      data: [{ slot_id: 'slot-1', status: 'REJECTED' }],
    })

    renderCalendar({ isOwner: false, isAuthenticated: true })

    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.queryByText('Requested')).not.toBeInTheDocument()
  })

  it('shows "Pending" label on a slot that is globally PENDING (someone else requested)', () => {
    const slot = makeSlot({ status: 'PENDING' })
    mockUseAvailabilitySlots.mockReturnValue({ data: [slot] })
    mockUseMyRequests.mockReturnValue({ data: [] }) // Not my request

    renderCalendar({ isOwner: false, isAuthenticated: true })

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByText('Book')).not.toBeInTheDocument()
  })
})
