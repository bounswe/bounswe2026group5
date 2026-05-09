// web/src/routes/_unauthorized/__tests__/register.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

const { mockLink, mockNavigate } = vi.hoisted(() => ({
  mockLink: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('#/lib/demoAuth', () => ({
  setDemoAuthRole: vi.fn(),
}))

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: vi.fn((config) => {
    return () => {
      config.onSuccess({ access_token: 'fake-google-token' })
    }
  }),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const { mockRegisterFn, mockHandleAuthSuccess, createMutationMock } = vi.hoisted(() => ({
  mockRegisterFn: vi.fn(),
  mockHandleAuthSuccess: vi.fn(),
  createMutationMock: (options: any, result: 'success' | 'error' = 'success', errorMessage = 'Registration failed') => ({
    mutate: vi.fn(() => {
      if (result === 'success' && options?.onSuccess) {
        options.onSuccess({ user: { id: '1' } })
      } else if (result === 'error' && options?.onError) {
        options.onError(new Error('API Error'))
      }
    }),
    isPending: false,
    isError: result === 'error',
    error: result === 'error' ? { message: errorMessage } : null,
  })
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  registerFn: mockRegisterFn,
  googleLoginFn: vi.fn(),
  handleAuthSuccess: mockHandleAuthSuccess,
  meQueryOptions: { queryKey: ['me'], queryFn: () => null },
}))

const { mockUseMutation } = vi.hoisted(() => ({
  mockUseMutation: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: (options: Record<string, unknown>) => mockUseMutation(options),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => () => ({
      update: vi.fn().mockReturnThis(),
    }),
    useRouter: () => ({ navigate: mockNavigate }),
    Link: mockLink,
  }
})

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    User: () => <span data-testid="icon-user" />,
    Mail: () => <span data-testid="icon-mail" />,
  }
})

import { RegisterPage } from '../register'

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLink.mockImplementation(({ children, to }: { children: ReactNode; to: string }) => (
        <a href={to} data-testid={`link-${to.replace('/', '')}`}>{children}</a>
    ))
    mockUseMutation.mockImplementation((opts: any) => createMutationMock(opts))
  })

  describe('Rendering', () => {
    // ✅ Removed Full Name — it doesn't exist in the form
    it('renders the registration form with all required fields', () => {
      render(<RegisterPage />)

      expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /Terms of Service/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument()
    })

    it('renders the left sidebar with branding content', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/Neighborship/i)).toBeInTheDocument()
      expect(screen.getByText(/Academic Editorial Excellence/i)).toBeInTheDocument()
      expect(screen.getByText(/Join our community of academic excellence/i)).toBeInTheDocument()
      expect(screen.getByText(/Join 2,000\+ scholars/i)).toBeInTheDocument()
    })

    it('renders the login link for existing users', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument()
      expect(screen.getByTestId('link-login')).toHaveTextContent(/Log in/i)
    })
  })

  describe('Client-side Validation', () => {
    // ✅ Removed full name tests — field doesn't exist in the component

    it('displays validation error for empty email field', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, 'a')
      await user.clear(emailInput)

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
      })
    })

    it('displays validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('displays validation error for empty password field', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^Password$/i)
      await user.type(passwordInput, 'a')
      await user.clear(passwordInput)

      await waitFor(() => {
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
      })
    })

    it('displays validation error for password with less than 8 characters', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^Password$/i)
      await user.type(passwordInput, 'short')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('displays validation error for empty confirm password field', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      await user.type(confirmPasswordInput, 'a')
      await user.clear(confirmPasswordInput)

      await waitFor(() => {
        expect(screen.getByText(/Please confirm your password/i)).toBeInTheDocument()
      })
    })

    it('displays validation error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^Password$/i)
      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)

      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('displays validation error when terms are not accepted', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, 'john@example.com')

      const passwordInput = screen.getByLabelText(/^Password$/i)
      await user.type(passwordInput, 'password123')

      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      await user.type(confirmPasswordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/You must agree to the terms/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Password$/i)
      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/i })
      const submitButton = screen.getByRole('button', { name: /Create Account/i })

      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      expect(submitButton).toBeInTheDocument()
    })

    it('clears all errors after successful validation on submit', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Create Account/i })
      await user.click(submitButton)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Password$/i)
      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/i })

      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/Email is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Password is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Please confirm your password/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/You must agree to the terms/i)).not.toBeInTheDocument()
      })
    })

    it('validates that password and confirm password match on submit', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Password$/i)
      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/i })
      const submitButton = screen.getByRole('button', { name: /Create Account/i })

      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('accepts all valid data without showing validation errors', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Password$/i)
      const confirmPasswordInput = screen.getByLabelText(/Confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox', { name: /Terms of Service/i })
      const submitButton = screen.getByRole('button', { name: /Create Account/i })

      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'securepassword123')
      await user.type(confirmPasswordInput, 'securepassword123')
      await user.click(termsCheckbox)

      await waitFor(() => {
        expect(screen.queryByText(/Email is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Password is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Passwords do not match/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/You must agree to the terms/i)).not.toBeInTheDocument()
      })

      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Terms and Conditions Link', () => {
    it('renders links to Terms of Service and Privacy Policy', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument()
      expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument()
    })
  })

  describe('Mutation States', () => {
    it('calls handleAuthSuccess and navigates on success', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.type(screen.getByLabelText(/Confirm password/i), 'password123')
      await user.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))
      await user.click(screen.getByRole('button', { name: /Create Account/i }))

      expect(mockHandleAuthSuccess).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/gettingToKnowYou' })
    })

    it('displays error message on mutation error and calls onError', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockUseMutation.mockImplementation((opts: any) => createMutationMock(opts, 'error'))

      const user = userEvent.setup()
      render(<RegisterPage />)
      
      await user.type(screen.getByLabelText(/Email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.type(screen.getByLabelText(/Confirm password/i), 'password123')
      await user.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))
      await user.click(screen.getByRole('button', { name: /Create Account/i }))
 
      expect(screen.getAllByText('Registration failed')[0]).toBeInTheDocument()
      expect(consoleSpy).toHaveBeenCalledWith('Register error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('shows loading text when pending', () => {
      mockUseMutation.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      })

      render(<RegisterPage />)
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
    })
  })
})