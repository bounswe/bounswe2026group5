// Tests for EmailVerificationBanner — covers visibility rules, resend flow,
// and persistence behavior (matches mobile implementation).

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
    mockUseQuery,
    mockUseMutation,
    mockResendMutate,
} = vi.hoisted(() => ({
    mockUseQuery: vi.fn(),
    mockUseMutation: vi.fn(),
    mockResendMutate: vi.fn(),
}))

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
    getStoredUser: vi.fn(() => ({ id: 'user-1' })),
    meQueryOptions: { queryKey: ['me'] },
    resendVerificationEmailFn: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>()
    return {
        ...actual,
        useQuery: () => mockUseQuery(),
        useMutation: (options: Record<string, unknown>) => mockUseMutation(options),
    }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    }
})

vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        AlertTriangle: () => <span data-testid="icon-warning" />,
        CheckCircle: () => <span data-testid="icon-check" />,
    }
})

// ─── Import under test ────────────────────────────────────────────────────────

import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        app_usage_mode: 'MENTEE',
        is_active: true,
        is_email_verified: true,
        ...overrides,
    }
}

const idleResend = {
    mutate: mockResendMutate,
    isPending: false,
    isIdle: true,
    isSuccess: false,
    isError: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmailVerificationBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseMutation.mockReturnValue(idleResend)
    })

    // ── Visibility rules ─────────────────────────────────────────────────────

    describe('visibility', () => {
        it('is hidden when the user has already verified their email', () => {
            mockUseQuery.mockReturnValue({ data: makeUser({ is_email_verified: true }) })
            const { container } = render(<EmailVerificationBanner />)

            expect(container).toBeEmptyDOMElement()
        })

        it('is hidden when user data has not yet loaded', () => {
            mockUseQuery.mockReturnValue({ data: undefined })
            const { container } = render(<EmailVerificationBanner />)

            expect(container).toBeEmptyDOMElement()
        })

        it('is hidden when there is no authenticated user', () => {
            mockUseQuery.mockReturnValue({ data: null })
            const { container } = render(<EmailVerificationBanner />)

            expect(container).toBeEmptyDOMElement()
        })

        it('is visible when the authenticated user has not verified their email', () => {
            mockUseQuery.mockReturnValue({ data: makeUser({ is_email_verified: false }) })
            render(<EmailVerificationBanner />)

            expect(screen.getByTestId('icon-warning')).toBeInTheDocument()
            expect(screen.getByText(/cannot start a mentorship request/i)).toBeInTheDocument()
        })
    })

    // ── Content ──────────────────────────────────────────────────────────────

    describe('content when visible', () => {
        beforeEach(() => {
            mockUseQuery.mockReturnValue({ data: makeUser({ is_email_verified: false }) })
        })

        it('shows a warning icon', () => {
            render(<EmailVerificationBanner />)
            expect(screen.getByTestId('icon-warning')).toBeInTheDocument()
        })

        it('shows a "resend now" action', () => {
            render(<EmailVerificationBanner />)
            expect(screen.getByRole('button', { name: /resend now/i })).toBeInTheDocument()
        })

        it('shows a link to the verification page', () => {
            render(<EmailVerificationBanner />)
            const link = screen.getByRole('link', { name: /learn more/i })
            expect(link).toHaveAttribute('href', '/verify-email')
        })

        it('does not show a dismiss button (persistence requirement)', () => {
            render(<EmailVerificationBanner />)
            expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
        })
    })

    // ── Resend flow ──────────────────────────────────────────────────────────

    describe('resend email flow', () => {
        beforeEach(() => {
            mockUseQuery.mockReturnValue({ data: makeUser({ is_email_verified: false }) })
        })

        it('calls the resend mutation when the resend button is clicked', async () => {
            const user = userEvent.setup()
            render(<EmailVerificationBanner />)

            await user.click(screen.getByRole('button', { name: /resend now/i }))

            expect(mockResendMutate).toHaveBeenCalledOnce()
        })

        it('shows loading text and disables the button while the request is in flight', () => {
            mockUseMutation.mockReturnValue({ ...idleResend, isPending: true, isIdle: false })
            render(<EmailVerificationBanner />)

            const btn = screen.getByRole('button', { name: /sending/i })
            expect(btn).toBeDisabled()
        })

        it('replaces the resend button with a success confirmation after sending', () => {
            mockUseMutation.mockReturnValue({ ...idleResend, isSuccess: true, isIdle: false })
            render(<EmailVerificationBanner />)

            expect(screen.getByText(/email sent/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-check')).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
        })
    })
})