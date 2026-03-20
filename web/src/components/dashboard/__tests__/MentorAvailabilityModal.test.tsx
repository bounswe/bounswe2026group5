// web/src/components/dashboard/__tests__/MentorAvailabilityModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MentorAvailabilityModal } from '../MentorAvailabilityModal'

// Mock the icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="icon-plus" />,
  Clock: () => <div data-testid="icon-clock" />,
}))

// Shadcn UI Dialogs use ResizeObserver under the hood, which isn't in JS-DOM by default.
// We need to mock it so the tests don't crash when the modal animates open.
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('MentorAvailabilityModal', () => {
  it('renders the trigger button and opens the modal to display the form', () => {
    render(<MentorAvailabilityModal />)
    
    // 1. Verify the button is on the dashboard
    const triggerButton = screen.getByRole('button', { name: /Set Availability/i })
    expect(triggerButton).toBeInTheDocument()
    
    // 2. Click the button to open the modal
    fireEvent.click(triggerButton)
    
    // 3. Verify the modal content renders correctly
    expect(screen.getByRole('heading', { name: /Add Availability Slot/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save Slot/i })).toBeInTheDocument()
  })
})