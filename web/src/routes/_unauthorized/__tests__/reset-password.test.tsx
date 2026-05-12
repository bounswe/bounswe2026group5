import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resetPasswordFnMock, clearAuthStateMock, navigateMock } = vi.hoisted(() => ({
  resetPasswordFnMock: vi.fn(),
  clearAuthStateMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  resetPasswordFn: resetPasswordFnMock,
  clearAuthState: clearAuthStateMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    Link: ({ children, to, className }: Record<string, unknown>) => (
      <a href={to as string} className={className as string}>
        {children as React.ReactNode}
      </a>
    ),
    useRouter: () => ({ navigate: navigateMock }),
  }
})

import { ResetPasswordPage } from '../reset-password'

function renderResetPasswordPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ResetPasswordPage />
    </QueryClientProvider>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: token present
    vi.stubGlobal('location', { search: '?token=valid-reset-token', href: '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the Invalid Reset Link screen when no token is in the URL', () => {
    vi.stubGlobal('location', { search: '', href: '' })

    renderResetPasswordPage()

    expect(screen.getByText(/Invalid Reset Link/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Request New Link/i })).toBeInTheDocument()
  })

  it('renders the password form when a valid token is present', () => {
    renderResetPasswordPage()

    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Confirm New Password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument()
  })

  it('shows a validation error when the password is shorter than 8 characters', async () => {
    const user = userEvent.setup({ delay: null })
    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'short')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'short')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()
    expect(resetPasswordFnMock).not.toHaveBeenCalled()
  })

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup({ delay: null })
    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'password123')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'different456')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    expect(resetPasswordFnMock).not.toHaveBeenCalled()
  })

  it('shows a success banner after a successful reset', async () => {
    const user = userEvent.setup({ delay: null })
    resetPasswordFnMock.mockResolvedValueOnce({ detail: 'Password reset successfully.' })

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'newpassword123')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Password reset successfully/i),
      ).toBeInTheDocument()
    })
  })

  it('hides the submit button after a successful reset', async () => {
    const user = userEvent.setup({ delay: null })
    resetPasswordFnMock.mockResolvedValueOnce({ detail: 'Password reset successfully.' })

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'newpassword123')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Reset Password/i })).not.toBeInTheDocument()
    })
  })

  it('shows an API error message when the reset request fails', async () => {
    const user = userEvent.setup({ delay: null })
    const apiError = new Error('Token is invalid or expired.')
    resetPasswordFnMock.mockRejectedValueOnce(apiError)

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'newpassword123')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    await waitFor(() => {
      expect(screen.getByText(/Token is invalid or expired/i)).toBeInTheDocument()
    })
  })

  it('shows a pending state while the reset request is in-flight', async () => {
    const user = userEvent.setup({ delay: null })

    let resolveRequest: ((value: unknown) => void) | undefined
    resetPasswordFnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    renderResetPasswordPage()

    await user.type(screen.getByLabelText(/^New Password$/i), 'newpassword123')
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /Reset Password/i }))

    expect(await screen.findByRole('button', { name: /Resetting/i })).toBeDisabled()

    resolveRequest?.({ detail: 'done' })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Resetting/i })).not.toBeInTheDocument()
    })
  })
})
