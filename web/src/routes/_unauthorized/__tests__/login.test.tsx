import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateMock, loginFnMock, googleLoginFnMock, handleAuthSuccessMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  loginFnMock: vi.fn(),
  googleLoginFnMock: vi.fn(),
  handleAuthSuccessMock: vi.fn(),
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

vi.mock('#/hooks/useGoogleLoginSafe', () => ({
  useGoogleLoginSafe: vi.fn((config) => {
    // Return a function that triggers the onSuccess callback with a fake token
    return () => {
      config.onSuccess({ access_token: 'fake-google-token' })
    }
  }),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  loginFn: loginFnMock,
  googleLoginFn: googleLoginFnMock,
  handleAuthSuccess: handleAuthSuccessMock,
}))

import { LoginPage } from '../login'

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs in successfully and redirects to dashboard', async () => {
    const user = userEvent.setup()

    const authResponse = {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: {
        id: 'user-1',
        username: 'mentor.alex',
        email: 'alex@example.com',
      },
    }

    loginFnMock.mockResolvedValue(authResponse)

    renderLoginPage()

    await user.type(screen.getByLabelText(/Email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'pass123456')
    await user.click(screen.getByRole('button', { name: /Sign in/i }))

    await waitFor(() => {
      expect(loginFnMock).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'pass123456',
      }, expect.anything())
    })

    expect(handleAuthSuccessMock).toHaveBeenCalledWith(authResponse)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/dashboard' })
  })

  it('shows API error message when sign-in fails', async () => {
    const user = userEvent.setup()

    loginFnMock.mockRejectedValue(new Error('Invalid credentials'))

    renderLoginPage()

    await user.type(screen.getByLabelText(/Email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /Sign in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(handleAuthSuccessMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows a pending state while request is in flight', async () => {
    const user = userEvent.setup()

    let resolveLogin: ((value: unknown) => void) | undefined
    loginFnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
    )

    renderLoginPage()

    await user.type(screen.getByLabelText(/Email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'pass123456')
    await user.click(screen.getByRole('button', { name: /Sign in/i }))

    expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled()

    resolveLogin?.({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: { id: 'u1', username: 'alex', email: 'alex@example.com' },
    })

    await waitFor(() => {
      expect(handleAuthSuccessMock).toHaveBeenCalled()
    })
  })

  it('logs in successfully with Google', async () => {
    const user = userEvent.setup()

    const authResponse = {
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: {
        id: 'user-1',
        username: 'google.user',
        email: 'google@example.com',
      },
    }

    googleLoginFnMock.mockResolvedValue(authResponse)

    renderLoginPage()

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i })
    await user.click(googleBtn)

    await waitFor(() => {
      expect(googleLoginFnMock).toHaveBeenCalledWith('fake-google-token', expect.anything())
    })

    expect(handleAuthSuccessMock).toHaveBeenCalledWith(authResponse)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/dashboard' })
  })
})
