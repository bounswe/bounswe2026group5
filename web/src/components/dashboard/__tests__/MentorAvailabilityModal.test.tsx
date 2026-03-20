// web/src/components/dashboard/__tests__/MentorAvailabilityModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MentorAvailabilityModal } from '../MentorAvailabilityModal'

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Clock: () => <span data-testid="icon-clock" />,
  XIcon: () => <span data-testid="icon-close" />,
  ChevronDownIcon: () => <span data-testid="icon-chevron-down" />,
  ChevronUpIcon: () => <span data-testid="icon-chevron-up" />,
  CheckIcon: () => <span data-testid="icon-check-dropdown" />, 
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('MentorAvailabilityModal', () => {
  it('renders the trigger button and opens the modal to display the form', () => {
    render(<MentorAvailabilityModal />)
    
    const triggerButton = screen.getByRole('button', { name: /Set Availability/i })
    expect(triggerButton).toBeInTheDocument()
    
    fireEvent.click(triggerButton)
    
    expect(screen.getByRole('heading', { name: /Add Availability Slot/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save Slot/i })).toBeInTheDocument()
  })
})