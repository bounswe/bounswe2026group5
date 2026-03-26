// web/src/routes/_authorized/__tests__/dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseSearch } = vi.hoisted(() => {
  return { mockUseSearch: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      useSearch: mockUseSearch,
    }),
    Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  }
})

import { DashboardHome } from '../dashboard'

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
  }
})

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
    expect(screen.queryByRole('heading', { name: /Sent Requests/i })).not.toBeInTheDocument()
  })
})