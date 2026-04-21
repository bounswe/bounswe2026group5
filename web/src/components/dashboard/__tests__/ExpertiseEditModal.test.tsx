// web/src/components/dashboard/__tests__/ExpertiseEditModal.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExpertiseEditModal } from '../ExpertiseEditModal'

// Mock the icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  XIcon: () => <span data-testid="icon-close" />,
}))

describe('ExpertiseEditModal', () => {
  it('renders the trigger button, opens the modal, and displays current skills', () => {
    render(
      <ExpertiseEditModal
        initialSkills={[
          { id: '1', name: 'Test Driven Development', category: 'Software', description: 'TDD skills' },
        ]}
      />,
    )
    
    // 1. Verify the button is on the dashboard
    const triggerButton = screen.getByRole('button', { name: /Edit Skills/i })
    expect(triggerButton).toBeInTheDocument()
    
    // 2. Click the button to open the modal
    fireEvent.click(triggerButton)
    
    // 3. Verify the modal content and mock data render correctly
    expect(screen.getByRole('heading', { name: /Edit Skills/i })).toBeInTheDocument()
    expect(screen.getByText('Test Driven Development')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument()
  })
})