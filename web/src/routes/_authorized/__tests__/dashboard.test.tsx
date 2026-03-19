// web/src/routes/_authorized/__tests__/dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 1. Use vi.hoisted to safely create the mock before vi.mock runs
const { mockUseSearch } = vi.hoisted(() => {
  return { mockUseSearch: vi.fn() }
})

// 2. Mock TanStack Router
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (config: any) => ({
      ...config,
      useSearch: mockUseSearch,
    }),
  }
})

// 3. Now import the component
import { DashboardHome } from '../dashboard'

// 4. Mock the icons
vi.mock('lucide-react', () => ({
  CalendarDays: () => <div data-testid="icon-calendar" />,
  Clock: () => <div data-testid="icon-clock" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  XCircle: () => <div data-testid="icon-x" />,
  ArrowRight: () => <div data-testid="icon-arrow" />,
  Plus: () => <div data-testid="icon-plus" />,
}))

describe('Dashboard Component Routing & Role Variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Mentee Dashboard by default', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentee' })
    render(<DashboardHome />)

    expect(screen.getByRole('heading', { name: /Mentee Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sent Requests/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Incoming Requests/i })).not.toBeInTheDocument()
  })

  it('renders the Mentor Dashboard when URL specifies mentor mode', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentor' })
    render(<DashboardHome />)

    expect(screen.getByRole('heading', { name: /Mentor Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Incoming Requests/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /My Listed Expertise/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Sent Requests/i })).not.toBeInTheDocument()
  })
})