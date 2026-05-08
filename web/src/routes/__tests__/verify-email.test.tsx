// Tests for the email verification page — covers all four rendered states,
// branch coverage for token presence/absence, authenticated/unauthenticated,
// and all user-facing interactions.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// ─── Globals required by jsdom ────────────────────────────────────────────────

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
    mockVerifyMutate,
    mockResendMutate,
    mockNavigate,
    mockUseMutation,
    mockGetStoredUser,
    mockVerifyEmailFn,
    mockResendVerificationEmailFn,
} = vi.hoisted(() => ({
    mockVerifyMutate: vi.fn(),
    mockResendMutate: vi.fn(),
    mockNavigate: vi.fn(),
    mockUseMutation: vi.fn(),
    mockGetStoredUser: vi.fn(),
    mockVerifyEmailFn: vi.fn(),
    mockResendVerificationEmailFn: vi.fn(),
}))

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../routeTree.gen', () => ({}))
vi.mock('../../../router', () => ({}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
    verifyEmailFn: mockVerifyEmailFn,
    resendVerificationEmailFn: mockResendVerificationEmailFn,
    getStoredUser: mockGetStoredUser,
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
        createFileRoute: () => () => ({ update: vi.fn().mockReturnThis() }),
        useRouter: () => ({ navigate: mockNavigate }),
        Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    }
})

vi.mock('@/components/layout/UnauthorizedHeader', () => ({
    UnauthorizedHeader: () => <div data-testid="unauthorized-header" />,
}))

vi.mock('@/components/layout/UnauthorizedFooter', () => ({
    UnauthorizedFooter: () => <div data-testid="unauthorized-footer" />,
}))

vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        Mail: () => <span data-testid="icon-mail" />,
        CheckCircle: () => <span data-testid="icon-check" />,
        XCircle: () => <span data-testid="icon-x-circle" />,
        Loader2: () => <span data-testid="icon-loader" />,
    }
})

// ─── Import under test (after all mocks are in place) ─────────────────────────

import { VerifyEmailPage } from '../verify-email'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const idleVerifyState = {
    mutate: mockVerifyMutate,
    isPending: false,
    isIdle: true,
    isSuccess: false,
    isError: false,
    error: null,
}

const idleResendState = {
    mutate: mockResendMutate,
    isPending: false,
    isIdle: true,
    isSuccess: false,
    isError: false,
    error: null,
}

function setupMutations(
    verifyOverride: Partial<typeof idleVerifyState> = {},
    resendOverride: Partial<typeof idleResendState> = {},
) {
    mockUseMutation
        .mockReturnValueOnce({ ...idleVerifyState, ...verifyOverride })
        .mockReturnValueOnce({ ...idleResendState, ...resendOverride })
}

function setToken(token: string) {
    Object.defineProperty(globalThis, 'location', {
        value: { search: token ? `?token=${token}` : '' },
        writable: true,
        configurable: true,
    })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Email verification page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetStoredUser.mockReturnValue({ id: 'user-1' }) // authenticated by default
        setToken('')
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ── Layout shell ────────────────────────────────────────────────────────

    describe('page layout', () => {
        it('renders the site header and footer', () => {
            setupMutations()
            setToken('')
            render(<VerifyEmailPage />)

            expect(screen.getByTestId('unauthorized-header')).toBeInTheDocument()
            expect(screen.getByTestId('unauthorized-footer')).toBeInTheDocument()
        })
    })

    // ── No-token state ("Please verify your email") ─────────────────────────

    describe('when there is no token in the URL', () => {
        beforeEach(() => setToken(''))

        it('shows the pending verification prompt', () => {
            setupMutations()
            render(<VerifyEmailPage />)

            expect(screen.getByText(/please verify your email/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-mail')).toBeInTheDocument()
        })

        it('shows the spam-folder hint', () => {
            setupMutations()
            render(<VerifyEmailPage />)

            expect(screen.getByText(/spam folder/i)).toBeInTheDocument()
        })

        it('offers a resend button when the user is authenticated', () => {
            setupMutations()
            mockGetStoredUser.mockReturnValue({ id: 'user-1' })
            render(<VerifyEmailPage />)

            const btn = screen.getByRole('button', { name: /resend verification email/i })
            expect(btn).toBeInTheDocument()
            expect(btn).not.toBeDisabled()
        })

        it('disables the resend button when the user is not authenticated', () => {
            setupMutations()
            mockGetStoredUser.mockReturnValue(null)
            render(<VerifyEmailPage />)

            expect(screen.getByRole('button', { name: /resend verification email/i })).toBeDisabled()
        })

        it('calls the resend mutation when the resend button is clicked', async () => {
            setupMutations()
            const user = userEvent.setup()
            render(<VerifyEmailPage />)

            await user.click(screen.getByRole('button', { name: /resend verification email/i }))

            expect(mockResendMutate).toHaveBeenCalledOnce()
        })

        it('shows loading text on the resend button while resend is in progress', () => {
            setupMutations({}, { isPending: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
        })

        it('replaces the resend button with a success message after sending', () => {
            setupMutations({}, { isSuccess: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/verification email sent/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-check')).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
        })

        it('does not call the verify mutation when there is no token', () => {
            setupMutations()
            render(<VerifyEmailPage />)

            expect(mockVerifyMutate).not.toHaveBeenCalled()
        })
    })

    // ── Token present: loading ───────────────────────────────────────────────

    describe('when a token is present and verification is in progress', () => {
        beforeEach(() => setToken('valid-token-abc'))

        it('shows the verifying spinner state', () => {
            setupMutations({ isPending: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
        })

        it('shows the loading state when mutation has not yet fired (idle)', () => {
            setupMutations({ isIdle: true, isPending: false })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()
        })

        it('fires the verify mutation with the token value on mount', () => {
            setupMutations()
            render(<VerifyEmailPage />)

            expect(mockVerifyMutate).toHaveBeenCalledWith('valid-token-abc')
        })

        it('does not show the pending-verification prompt when a token is present', () => {
            setupMutations({ isPending: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.queryByTestId('icon-mail')).not.toBeInTheDocument()
        })
    })

    // ── Token present: success ───────────────────────────────────────────────

    describe('when the token is valid and verification succeeds', () => {
        beforeEach(() => setToken('good-token'))

        it('shows the success confirmation message', () => {
            setupMutations({ isSuccess: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/email successfully verified/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-check')).toBeInTheDocument()
        })

        it('informs the user they will be redirected automatically', () => {
            setupMutations({ isSuccess: true, isIdle: false })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/automatically redirected/i)).toBeInTheDocument()
        })

        it('navigates to the dashboard after 3 seconds on success', () => {
            vi.useFakeTimers()

            let capturedOnSuccess: (() => void) | undefined
            mockUseMutation
                .mockImplementationOnce((opts: { onSuccess?: () => void }) => {
                    capturedOnSuccess = opts.onSuccess
                    return { ...idleVerifyState, isSuccess: false }
                })
                .mockReturnValueOnce(idleResendState)

            render(<VerifyEmailPage />)

            capturedOnSuccess?.()
            vi.advanceTimersByTime(3000)

            expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
        })

        it('does not navigate before the 3-second delay has elapsed', () => {
            vi.useFakeTimers()

            let capturedOnSuccess: (() => void) | undefined
            mockUseMutation
                .mockImplementationOnce((opts: { onSuccess?: () => void }) => {
                    capturedOnSuccess = opts.onSuccess
                    return { ...idleVerifyState, isSuccess: false }
                })
                .mockReturnValueOnce(idleResendState)

            render(<VerifyEmailPage />)

            capturedOnSuccess?.()
            vi.advanceTimersByTime(2999)

            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })

    // ── Token present: error ─────────────────────────────────────────────────

    describe('when the token is invalid or expired', () => {
        beforeEach(() => setToken('bad-token'))

        it('shows the verification-failed heading', () => {
            setupMutations({ isError: true, isIdle: false, error: new Error('Token expired') })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
            expect(screen.getByTestId('icon-x-circle')).toBeInTheDocument()
        })

        it('displays the error message returned by the API', () => {
            setupMutations({ isError: true, isIdle: false, error: new Error('Token has already been used') })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/token has already been used/i)).toBeInTheDocument()
        })

        it('shows a generic fallback message when there is no specific error message', () => {
            setupMutations({ isError: true, isIdle: false, error: null })
            render(<VerifyEmailPage />)

            expect(screen.getByText(/expired or is invalid/i)).toBeInTheDocument()
        })

        it('shows a resend button when the user is authenticated', () => {
            mockGetStoredUser.mockReturnValue({ id: 'user-1' })
            setupMutations({ isError: true, isIdle: false, error: new Error('Bad token') })
            render(<VerifyEmailPage />)

            const btn = screen.getByRole('button', { name: /resend verification email/i })
            expect(btn).not.toBeDisabled()
        })

        it('disables the resend button when the user is not authenticated', () => {
            mockGetStoredUser.mockReturnValue(null)
            setupMutations({ isError: true, isIdle: false, error: new Error('Bad token') })
            render(<VerifyEmailPage />)

            expect(screen.getByRole('button', { name: /resend verification email/i })).toBeDisabled()
        })

        it('calls the resend mutation when the resend button is clicked', async () => {
            setupMutations({ isError: true, isIdle: false, error: new Error('Bad token') })
            const user = userEvent.setup()
            render(<VerifyEmailPage />)

            await user.click(screen.getByRole('button', { name: /resend verification email/i }))

            expect(mockResendMutate).toHaveBeenCalledOnce()
        })

        it('shows success confirmation after resend completes', () => {
            setupMutations(
                { isError: true, isIdle: false, error: new Error('Expired') },
                { isSuccess: true, isIdle: false },
            )
            render(<VerifyEmailPage />)

            expect(screen.getByText(/verification email sent/i)).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
        })

        it('navigates to login when the "return to login" button is clicked', async () => {
            setupMutations({ isError: true, isIdle: false, error: new Error('Expired') })
            const user = userEvent.setup()
            render(<VerifyEmailPage />)

            await user.click(screen.getByRole('button', { name: /return to login/i }))

            expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
        })
    })

    // ── Edge cases ───────────────────────────────────────────────────────────

    describe('edge cases', () => {
        it('treats an explicit empty token string the same as no token', () => {
            setToken('')
            setupMutations()
            render(<VerifyEmailPage />)

            // Should show the pending state, not the token-processing state
            expect(screen.getByText(/please verify your email/i)).toBeInTheDocument()
            expect(mockVerifyMutate).not.toHaveBeenCalled()
        })

        it('passes the full token including special characters to the verify mutation', () => {
            const tokenWithSpecialChars = 'abc+def/ghi==XYZ'
            setToken(encodeURIComponent(tokenWithSpecialChars))
            setupMutations()
            render(<VerifyEmailPage />)

            expect(mockVerifyMutate).toHaveBeenCalledWith(tokenWithSpecialChars)
        })

        it('does not call verify mutation more than once on initial render', () => {
            setToken('once-only-token')
            setupMutations()
            render(<VerifyEmailPage />)

            expect(mockVerifyMutate).toHaveBeenCalledTimes(1)
        })
    })
})