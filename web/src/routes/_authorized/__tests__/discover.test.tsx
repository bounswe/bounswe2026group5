// web/src/routes/_authorized/__tests__/discover.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {infiniteQueryOptions, QueryClient, QueryClientProvider, queryOptions} from '@tanstack/react-query'

// ── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockNavigate, mockMentorSearchLogic } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockMentorSearchLogic: (mentors: any[], params: any, page = 1) => {
    const pageSize = params.pageSize ?? 6
    let results = [...mentors]

    if (params.q) {
      const q = params.q.toLowerCase()
      results = results.filter((m) => {
        const nameMatch = m.full_name.toLowerCase().includes(q)
        const bioMatch = m.bio.toLowerCase().includes(q)
        const skillMatch = m.skills.some((s: string) => s.toLowerCase().includes(q))
        return nameMatch || bioMatch || skillMatch
      })
    }

    if (params.skills?.length) {
      results = results.filter((m: any) =>
        m.skills.some((s: string) => params.skills.includes(s)),
      )
    }

    const start = (page - 1) * pageSize
    return {
      count: results.length,
      page,
      pageSize,
      results: results.slice(start, start + pageSize),
    }
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({}),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Search: () => <div data-testid="icon-search" />,
    SlidersHorizontal: () => <div data-testid="icon-sliders" />,
    X: () => <div data-testid="icon-x" />,
  }
})

// ── Mock API data ────────────────────────────────────────────────────────────

const MOCK_SKILLS = [
  { id: 1, name: 'Python' },
  { id: 2, name: 'Kubernetes' },
  { id: 3, name: 'Go' },
  { id: 4, name: 'React' },
]

const makeMentor = (n: number) => ({
  id: `id-${n}`,
  username: `mentor${n}`,
  full_name: `Mentor ${n}`,
  bio: `Bio of mentor ${n}`,
  hidden: false,
  picture_url: null,
  title: `Engineer ${n}`,
  location: null,
  show_initials_only: false,
  skills: n % 2 === 0 ? ['Python'] : ['Kubernetes'],
  rating: 4.5,
  total_mentee_count: n,
})

// 8 mentors so Load More tests work (> PAGE_SIZE of 6)
const MOCK_MENTORS = Array.from({ length: 8 }, (_, i) => makeMentor(i + 1))

vi.mock('@/lib/queries/MessagingQueries.ts', () => ({
  useMessaging: () => ({
    matchedUsernames: new Set<string>(),
    sendMessageTo: vi.fn(),
  }),
}))

vi.mock('@/lib/queries/DiscoverQueries.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    mentorSearchInfiniteQueryOptions: (params: { pageSize?: number; q?: string; skills?: string[] }) =>
        infiniteQueryOptions({
          queryKey: ['mentors', 'search', params],
          queryFn: async ({ pageParam }) => mockMentorSearchLogic(MOCK_MENTORS, params, pageParam),
          initialPageParam: 1,
          getNextPageParam: (lastPage: { page: number; pageSize: number; count: number }) => {
            const fetched = lastPage.page * lastPage.pageSize
            return fetched < lastPage.count ? lastPage.page + 1 : undefined
          },
        }),
    allSkillsQueryOptions: queryOptions({
      queryKey: ['profiles', 'skills'],
      queryFn: async () => MOCK_SKILLS,
    }),
  }
})

// ── Test helpers ─────────────────────────────────────────────────────────────

import { DiscoverPage } from '../../_public/discover'

function renderDiscover() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
      <QueryClientProvider client={queryClient}>
        <DiscoverPage />
      </QueryClientProvider>,
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders the hero heading', () => {
    renderDiscover()
    expect(screen.getByRole('heading', { name: /Discover the/i })).toBeInTheDocument()
  })

  it('renders the search bar', () => {
    renderDiscover()
    expect(screen.getByPlaceholderText(/Search profiles, skills, or projects/i)).toBeInTheDocument()
  })

  it('renders the filter button', () => {
    renderDiscover()
    expect(screen.getByRole('button', { name: /Filter by skill/i })).toBeInTheDocument()
  })

  it('renders at least one ProfileCard on initial load', async () => {
    renderDiscover()
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
      expect(viewButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows at most PAGE_SIZE (6) cards on initial load', async () => {
    renderDiscover()
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
      expect(viewButtons.length).toBeLessThanOrEqual(6)
    })
  })

  // ── Search ──────────────────────────────────────────────────────────────────

  it('shows the empty state when no profiles match the search query', async () => {
    renderDiscover()
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })
    await waitFor(() => {
      expect(screen.getByText(/No mentors found matching/i)).toBeInTheDocument()
    })
  })

  it('filters profiles by skill name via search', async () => {
    renderDiscover()
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)
    fireEvent.change(input, { target: { value: 'Kubernetes' } })
    await waitFor(() => {
      expect(screen.getByText('Mentor 1')).toBeInTheDocument()
      expect(screen.queryByText('Mentor 2')).not.toBeInTheDocument()
    })
  })

  it('restores profiles when search query is cleared', async () => {
    renderDiscover()
    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)

    fireEvent.change(input, { target: { value: 'Kubernetes' } })
    await waitFor(() => expect(screen.getByText('Mentor 1')).toBeInTheDocument())

    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /View Profile/i })
      expect(viewButtons.length).toBeGreaterThan(1)
    })
  })

  // ── Skill filter panel ──────────────────────────────────────────────────────

  it('opens the skill filter panel when the filter button is clicked', async () => {
    renderDiscover()
    // Wait for skills to load first
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    expect(screen.getByText(/Filter by Skill/i)).toBeInTheDocument()
  })

  it('closes the filter panel when clicked outside', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    expect(screen.getByText(/Filter by Skill/i)).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText(/Filter by Skill/i)).not.toBeInTheDocument()
  })

  it('filters profiles when a skill chip is selected', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))

    const pythonChip = await screen.findByRole('button', { name: /^Python$/i })
    fireEvent.click(pythonChip)

    await waitFor(() => {
      expect(screen.getByText('Mentor 2')).toBeInTheDocument()
      expect(screen.queryByText('Mentor 1')).not.toBeInTheDocument()
    })
  })

  it('shows the active filter count badge on the filter button', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    const goChip = await screen.findByRole('button', { name: /^Go$/i })
    fireEvent.click(goChip)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('clears skill filters when "Clear all" is clicked', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    const goChip = await screen.findByRole('button', { name: /^Go$/i })
    fireEvent.click(goChip)

    const clearAll = screen.getByRole('button', { name: /Clear all/i })
    fireEvent.click(clearAll)

    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  // ── Pagination ──────────────────────────────────────────────────────────────

  it('shows the Load More button when there are more profiles than PAGE_SIZE', async () => {
    renderDiscover()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument()
    })
  })

  it('loads more profiles when Load More is clicked', async () => {
    renderDiscover()
    await waitFor(() => screen.getAllByRole('button', { name: /View Profile/i }))

    const before = screen.getAllByRole('button', { name: /View Profile/i }).length
    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))

    await waitFor(() => {
      const after = screen.getAllByRole('button', { name: /View Profile/i }).length
      expect(after).toBeGreaterThan(before)
    })
  })

  it('resets pagination when the search query changes', async () => {
    renderDiscover()
    await waitFor(() => screen.getByRole('button', { name: /Load More/i }))

    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeGreaterThan(6)
    })

    const input = screen.getByPlaceholderText(/Search profiles, skills, or projects/i)
    fireEvent.change(input, { target: { value: 'python' } })

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeLessThanOrEqual(6)
    })
  })

  // ── Navigation ──────────────────────────────────────────────────────────────

  it('navigates to the profile page when View Profile is clicked', async () => {
    renderDiscover()
    await waitFor(() => screen.getAllByRole('button', { name: /View Profile/i }))

    fireEvent.click(screen.getAllByRole('button', { name: /View Profile/i })[0])

    expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/profiles/$username',
          params: expect.objectContaining({ username: expect.any(String) }),
        }),
    )
  })
})