// web/src/routes/_authorized/__tests__/discover.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 1. Hoist navigate mock so it is available inside vi.mock factories
const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    createFileRoute: () => () => ({}),
    useNavigate: () => mockNavigate,
  }
})

// 2. Mock Lucide icons to prevent SVG rendering errors in jsdom
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    Search: () => <div data-testid="icon-search" />,
    SlidersHorizontal: () => <div data-testid="icon-sliders" />,
    X: () => <div data-testid="icon-x" />,
  }
})

import { DiscoverPage } from '../discover'

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the hero heading', () => {
    render(<DiscoverPage />)
    expect(screen.getByRole('heading', { name: /Discover the/i })).toBeInTheDocument()
  })

  it('renders the search bar', () => {
    render(<DiscoverPage />)
    expect(screen.getByPlaceholderText(/Search profiles, skills, or projects/i)).toBeInTheDocument()
  })

  it('renders the filter button', () => {
    render(<DiscoverPage />)
    expect(screen.getByRole('button', { name: /Filter by skill/i })).toBeInTheDocument()
  })

  it('renders at least one ProfileCard on initial load', () => {
    render(<DiscoverPage />)
    // Every card has a "View Profile" button
    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    expect(viewButtons.length).toBeGreaterThan(0)
  })

  it('shows at most PAGE_SIZE (6) cards on initial load', () => {
    render(<DiscoverPage />)
    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    expect(viewButtons.length).toBeLessThanOrEqual(6)
  })

  // ── Search ─────────────────────────────────────────────────────────────────

  it('filters profiles by name as the user types', () => {
    render(<DiscoverPage />)
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)

    fireEvent.change(input, { target: { value: 'Dr. Sarah Chen' } })

    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    // Other profiles should be gone
    expect(screen.queryByText('James Wilson')).not.toBeInTheDocument()
  })

  it('filters profiles by skill name', () => {
    render(<DiscoverPage />)
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)

    fireEvent.change(input, { target: { value: 'Kubernetes' } })

    // Julian Thorne is the only mentor with Kubernetes
    expect(screen.getByText('Julian Thorne')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Sarah Chen')).not.toBeInTheDocument()
  })

  it('shows the empty state when no profiles match the search query', () => {
    render(<DiscoverPage />)
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)

    fireEvent.change(input, { target: { value: 'xyznonexistent' } })

    expect(screen.getByText(/No mentors found matching/i)).toBeInTheDocument()
  })

  it('restores all profiles when search query is cleared', () => {
    render(<DiscoverPage />)
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)

    fireEvent.change(input, { target: { value: 'Dr. Sarah Chen' } })
    fireEvent.change(input, { target: { value: '' } })

    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    expect(viewButtons.length).toBeGreaterThan(1)
  })

  // ── Skill filter panel ─────────────────────────────────────────────────────

  it('opens the skill filter panel when the filter button is clicked', () => {
    render(<DiscoverPage />)

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))

    expect(screen.getByText(/Filter by Skill/i)).toBeInTheDocument()
  })

  it('closes the filter panel when clicked outside', () => {
    render(<DiscoverPage />)

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    expect(screen.getByText(/Filter by Skill/i)).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText(/Filter by Skill/i)).not.toBeInTheDocument()
  })

  it('filters profiles when a skill chip is selected', () => {
    render(<DiscoverPage />)

    // Open filter panel
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))

    // Click the "Python" chip — James Wilson and Alex Sterling have Python
    const pythonChip = screen.getByRole('button', { name: /^Python$/i })
    fireEvent.click(pythonChip)

    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    expect(viewButtons.length).toBeGreaterThan(0)
    // Dr. Sarah Chen has Python/Django, not plain Python — she should not appear
    expect(screen.queryByText('Julian Thorne')).not.toBeInTheDocument()
  })

  it('shows the active filter count badge on the filter button', () => {
    render(<DiscoverPage />)

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))

    const goChip = screen.getByRole('button', { name: /^Go$/i })
    fireEvent.click(goChip)

    // Badge with count "1" should be visible inside the trigger button
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the empty state when skill filters match no mentor', () => {
    render(<DiscoverPage />)

    // Search for something that won't match any mentor
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })

    // Open filter panel and select a skill
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    const goChip = screen.getByRole('button', { name: /^Go$/i })
    fireEvent.click(goChip)

    expect(screen.getByText(/No mentors found matching/i)).toBeInTheDocument()
  })

  it('clears skill filters when "Clear all" is clicked', () => {
    render(<DiscoverPage />)

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Go$/i }))

    // "Clear all" appears when at least one skill is active
    const clearAll = screen.getByRole('button', { name: /Clear all/i })
    fireEvent.click(clearAll)

    // Badge should be gone
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  // ── Pagination ─────────────────────────────────────────────────────────────

  it('shows the Load More button when there are more profiles than PAGE_SIZE', () => {
    render(<DiscoverPage />)
    // There are 8 mentor profiles in mock data (> 6 PAGE_SIZE)
    expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument()
  })

  it('loads more profiles when Load More is clicked', () => {
    render(<DiscoverPage />)

    const before = screen.getAllByRole('button', { name: /View Profile/i }).length
    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    const after = screen.getAllByRole('button', { name: /View Profile/i }).length

    expect(after).toBeGreaterThan(before)
  })

  it('hides the Load More button once all profiles are shown', () => {
    render(<DiscoverPage />)

    // Keep clicking until the button disappears
    while (screen.queryByRole('button', { name: /Load More/i })) {
      fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    }

    expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument()
  })

  it('resets pagination when the search query changes', () => {
    render(<DiscoverPage />)

    // Load extra profiles past PAGE_SIZE
    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    const afterLoadMore = screen.getAllByRole('button', { name: /View Profile/i }).length
    expect(afterLoadMore).toBeGreaterThan(6)

    // Typing a new query must reset visibleCount back to PAGE_SIZE
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)
    fireEvent.change(input, { target: { value: 'python' } })

    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    expect(viewButtons.length).toBeLessThanOrEqual(6)
  })

  // ── Navigation ─────────────────────────────────────────────────────────────

  it('navigates to the profile page when View Profile is clicked', () => {
    render(<DiscoverPage />)

    const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
    fireEvent.click(viewButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/profiles/$profileId',
        params: expect.objectContaining({ profileId: expect.any(String) }),
      }),
    )
  })
})
