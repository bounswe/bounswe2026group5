import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockMutate, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('#/lib/queries/AdminQueries.ts', () => ({
  useSubmitReport: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

import { ReportUserDialog } from '../ReportUserDialog'

function renderDialog(username = 'test-user') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ReportUserDialog reportedUsername={username} />
    </QueryClientProvider>
  )
}

describe('ReportUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /Report/i })).toBeInTheDocument()
  })

  it('opens the dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    renderDialog('jane-doe')

    await user.click(screen.getByRole('button', { name: /Report/i }))

    expect(screen.getByText('Report jane-doe')).toBeInTheDocument()
    expect(screen.getByText(/Help us understand what's wrong/i)).toBeInTheDocument()
  })

  it('submits the report successfully', async () => {
    const user = userEvent.setup()
    mockMutate.mockImplementation((_payload, callbacks) => {
      callbacks.onSuccess()
    })

    renderDialog('target-user')
    await user.click(screen.getByRole('button', { name: /Report/i }))

    // Select reason
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'SPAM')

    // Add description
    const textarea = screen.getByPlaceholderText(/Provide additional details/i)
    await user.type(textarea, 'Some spammy behavior')

    // Submit
    await user.click(screen.getByRole('button', { name: /Submit Report/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      {
        reportedUsername: 'target-user',
        reason: 'SPAM',
        description: 'Some spammy behavior',
      },
      expect.any(Object)
    )

    expect(toastSuccessMock).toHaveBeenCalledWith('Report submitted', expect.any(Object))
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Report target-user')).not.toBeInTheDocument()
    })
  })

  it('shows error toast when submission fails', async () => {
    const user = userEvent.setup()
    mockMutate.mockImplementation((_payload, callbacks) => {
      callbacks.onError(new Error('API Error'))
    })

    renderDialog()
    await user.click(screen.getByRole('button', { name: /Report/i }))

    await user.selectOptions(screen.getByRole('combobox'), 'OTHER')
    await user.click(screen.getByRole('button', { name: /Submit Report/i }))

    expect(toastErrorMock).toHaveBeenCalledWith('API Error')
  })

  it('validates that reason is selected before submission', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: /Report/i }))

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i })
    expect(submitBtn).toBeDisabled()
  })
})
