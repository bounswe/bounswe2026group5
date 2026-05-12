import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { forgotPasswordFnMock } = vi.hoisted(() => ({
  forgotPasswordFnMock: vi.fn(),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  forgotPasswordFn: forgotPasswordFnMock,
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
  }
})

import { ForgotPasswordPage } from '../forgot-password'

function renderForgotPasswordPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ForgotPasswordPage />
    </QueryClientProvider>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email field, submit button, and back-to-login link', () => {
    renderForgotPasswordPage()

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument()
  })

  it('calls forgotPasswordFn with the entered email on submit', async () => {
    const user = userEvent.setup()
    forgotPasswordFnMock.mockResolvedValueOnce({ detail: 'Email sent' })

    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => {
      expect(forgotPasswordFnMock).toHaveBeenCalledWith({ email: 'test@example.com' }, expect.anything())
    })
  })

  it('shows a privacy-preserving success message after submission', async () => {
    const user = userEvent.setup()
    forgotPasswordFnMock.mockResolvedValueOnce({ detail: 'Email sent' })

    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/If an account exists for that email, a reset link has been sent/i),
      ).toBeInTheDocument()
    })
  })

  it('hides the submit button after a successful submission', async () => {
    const user = userEvent.setup()
    forgotPasswordFnMock.mockResolvedValueOnce({ detail: 'Email sent' })

    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Send Reset Link/i })).not.toBeInTheDocument()
    })
  })

  it('shows a network error banner when the mutation fails', async () => {
    const user = userEvent.setup()
    forgotPasswordFnMock.mockRejectedValueOnce(new Error('Network error'))

    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Something went wrong. Please check your connection and try again/i),
      ).toBeInTheDocument()
    })
  })

  it('shows a pending state while the request is in-flight', async () => {
    const user = userEvent.setup()

    let resolveRequest: ((value: unknown) => void) | undefined
    forgotPasswordFnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    renderForgotPasswordPage()

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    expect(await screen.findByRole('button', { name: /Sending/i })).toBeDisabled()

    resolveRequest?.({ detail: 'done' })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Send Reset Link/i })).not.toBeInTheDocument()
    })
  })
})
