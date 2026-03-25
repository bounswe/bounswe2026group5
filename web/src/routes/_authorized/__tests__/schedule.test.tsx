import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SchedulePage } from '../schedule'

// 1. Use vi.hoisted so Vitest loads this BEFORE the mock runs
const { mockUseSearch } = vi.hoisted(() => ({
  mockUseSearch: vi.fn()
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      useSearch: mockUseSearch,
    }),
  }
})

// 2. Mock Lucide Icons to prevent JS-DOM SVG rendering errors
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="icon-left" />,
  ChevronRight: () => <div data-testid="icon-right" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  X: () => <div data-testid="icon-x" />,
  Globe: () => <div data-testid="icon-globe" />, 
}))

// 3. Mock the Availability Modal to isolate the page tests
vi.mock('@/components/dashboard/MentorAvailabilityModal', () => ({
  MentorAvailabilityModal: () => <button>Mocked Modal</button>
}))

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Mentee Learning Schedule by default', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentee' })
    render(<SchedulePage />)
    
    expect(screen.getByRole('heading', { name: /Learning Schedule/i })).toBeInTheDocument()
    expect(screen.getByText(/Keep track of your upcoming classes/i)).toBeInTheDocument()
    
    // Check that mentee-specific mock data is rendered
    expect(screen.getByText('Calculus II')).toBeInTheDocument()
    
    // Ensure the Mentor modal is NOT rendered for mentees
    expect(screen.queryByText('Mocked Modal')).not.toBeInTheDocument()
  })

  it('renders the Mentor Teaching Schedule and Availability Modal when in mentor mode', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentor' })
    render(<SchedulePage />)
    
    expect(screen.getByRole('heading', { name: /Teaching Schedule/i })).toBeInTheDocument()
    
    // Check that mentor-specific mock data is rendered
    expect(screen.getByText('Data Structures')).toBeInTheDocument()
    
    // Ensure the modal IS rendered
    expect(screen.getByText('Mocked Modal')).toBeInTheDocument()
  })

  it('filters the data table when a calendar day is clicked, and clears when clicked again', () => {
    mockUseSearch.mockReturnValue({ mode: 'mentor' })
    render(<SchedulePage />)
    
    // 1. Initial State: Both subjects should be visible in the table
    expect(screen.getByText('Data Structures')).toBeInTheDocument()
    expect(screen.getByText('Database Systems')).toBeInTheDocument()
    
    // 2. Click on the 28th (The day for Database Systems)
    // We target the number 28 inside the calendar grid
    const day28 = screen.getByText('28')
    fireEvent.click(day28)
    
    // 3. Filtered State: Data Structures should disappear, Database Systems stays
    expect(screen.queryByText('Data Structures')).not.toBeInTheDocument()
    expect(screen.getByText('Database Systems')).toBeInTheDocument()
    
    // The Header should update to show the filter is active
    expect(screen.getByText(/Sessions for 28 March 2026/i)).toBeInTheDocument()
    
    // 4. Clear the Filter (Click the "Clear Filter" button)
    const clearButton = screen.getByRole('button', { name: /Clear Filter/i })
    fireEvent.click(clearButton)
    
    // 5. Restored State: Everything should be back
    expect(screen.getByText('Data Structures')).toBeInTheDocument()
    expect(screen.getByText('All Sessions')).toBeInTheDocument()
  })
})