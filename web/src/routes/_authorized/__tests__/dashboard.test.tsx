import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    Search: () => <div data-testid="icon-search" />,
    SlidersHorizontal: () => <div data-testid="icon-sliders" />,
    X: () => <div data-testid="icon-x" />,
  }
})

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

const MOCK_MENTORS = Array.from({ length: 8 }, (_, i) => makeMentor(i + 1))

vi.mock('@/lib/queries/DiscoverQueries.ts', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    mentorSearchInfiniteQueryOptions: (params: any) => ({
      queryKey: ['mentors', 'search', params],
      queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
        const pageSize = params.pageSize ?? 6
        let results = [...MOCK_MENTORS]

        if (params.q) {
          const q = params.q.toLowerCase()
          results = results.filter(
              (m) =>
                  m.full_name.toLowerCase().includes(q) ||
                  m.bio.toLowerCase().includes(q) ||
                  m.skills.some((e: string) => e.toLowerCase().includes(q)),
          )
        }

        if (params.skills?.length) {
          results = results.filter((m) =>
              m.skills.some((e: string) => params.skills.includes(e)),
          )
        }

        const start = (pageParam - 1) * pageSize
        return {
          count: results.length,
          page: pageParam,
          pageSize,
          results: results.slice(start, start + pageSize),
        }
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        const fetched = lastPage.page * lastPage.pageSize
        return fetched < lastPage.count ? lastPage.page + 1 : undefined
      },
    }),
    allSkillsQueryOptions: {
      queryKey: ['profiles', 'skills'],
      queryFn: async () => MOCK_SKILLS,
    },
  }
})

import { DiscoverPage } from '../discover'

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

describe('DiscoverPage', () => {
  beforeEach(() => vi.clearAllMocks())

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
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeGreaterThan(0)
    })
  })

  it('shows at most PAGE_SIZE (6) cards on initial load', async () => {
    renderDiscover()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeLessThanOrEqual(6)
    })
  })

  it('shows the empty state when no profiles match the search query', async () => {
    renderDiscover()
    fireEvent.change(screen.getByPlaceholderText(/Search profiles, skills, or projects/i), {
      target: { value: 'xyznonexistent' },
    })
    await waitFor(() => {
      expect(screen.getByText(/No mentors found matching/i)).toBeInTheDocument()
    })
  })

  it('filters profiles by skill name via search', async () => {
    renderDiscover()
    fireEvent.change(screen.getByPlaceholderText(/Search profiles, skills, or projects/i), {
      target: { value: 'Kubernetes' },
    })
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
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeGreaterThan(1)
    })
  })

  it('opens the skill filter panel when the filter button is clicked', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    expect(screen.getByText(/Filter by Skill/i)).toBeInTheDocument()
  })

  it('closes the filter panel when clicked outside', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText(/Filter by Skill/i)).not.toBeInTheDocument()
  })

  it('filters profiles when a skill chip is selected', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^Python$/i }))
    await waitFor(() => {
      expect(screen.getByText('Mentor 2')).toBeInTheDocument()
      expect(screen.queryByText('Mentor 1')).not.toBeInTheDocument()
    })
  })

  it('shows the active filter count badge on the filter button', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^Go$/i }))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('clears skill filters when "Clear all" is clicked', async () => {
    renderDiscover()
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Filter by skill/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^Go$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Clear all/i }))
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('shows the Load More button when there are more profiles than PAGE_SIZE', async () => {
    renderDiscover()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument()
    })
  })

  it('appends more profiles when Load More is clicked', async () => {
    renderDiscover()
    await waitFor(() => screen.getAllByRole('button', { name: /View Profile/i }))
    const before = screen.getAllByRole('button', { name: /View Profile/i }).length

    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))

    await waitFor(() => {
      const after = screen.getAllByRole('button', { name: /View Profile/i }).length
      expect(after).toBeGreaterThan(before)
    })
  })

  it('hides Load More when all profiles are loaded', async () => {
    renderDiscover()
    await waitFor(() => screen.getByRole('button', { name: /Load More/i }))
    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument()
    })
  })

  it('resets to first page when search query changes', async () => {
    renderDiscover()
    await waitFor(() => screen.getByRole('button', { name: /Load More/i }))
    fireEvent.click(screen.getByRole('button', { name: /Load More/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeGreaterThan(6)
    })

    fireEvent.change(screen.getByPlaceholderText(/Search profiles, skills, or projects/i), {
      target: { value: 'Kubernetes' },
    })

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeLessThanOrEqual(6)
    })
  })

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