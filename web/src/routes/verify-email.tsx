import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Heading, Body, Muted } from '@/components/Typography'
import { UnauthorizedHeader } from '@/components/layout/UnauthorizedHeader'
import { UnauthorizedFooter } from '@/components/layout/UnauthorizedFooter'
import { verifyEmailFn, resendVerificationEmailFn, getStoredUser } from '#/lib/queries/AuthQueries.ts'

export const Route = createFileRoute('/verify-email')({
    component: VerifyEmailPage,
})

export function VerifyEmailPage() {
    // Use URLSearchParams directly to avoid TanStack Router splitting on `=` in base64 tokens
    const token = new URLSearchParams(globalThis.location.search).get('token') ?? ''
    const router = useRouter()
    const isAuthenticated = !!getStoredUser()
    const redirectTimer = useRef<ReturnType<typeof setTimeout>>(null)

    const verifyEmail = useMutation({
        mutationFn: verifyEmailFn,
        onSuccess: () => {
            redirectTimer.current = setTimeout(() => router.navigate({ to: '/dashboard' }), 3000)
        },
    })

    const resendVerification = useMutation({
        mutationFn: resendVerificationEmailFn,
    })

    useEffect(() => {
        if (token) {
            verifyEmail.mutate(token)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    useEffect(() => {
        return () => {
            if (redirectTimer.current) clearTimeout(redirectTimer.current)
        }
    }, [])

    return (
        <div className="flex flex-col min-h-screen bg-black/[0.02]">
            <UnauthorizedHeader />

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md rise-in">
                    {token ? (
                        <TokenState
                            isPending={verifyEmail.isPending || verifyEmail.isIdle}
                            isSuccess={verifyEmail.isSuccess}
                            isError={verifyEmail.isError}
                            errorMessage={verifyEmail.error?.message}
                            isAuthenticated={isAuthenticated}
                            resendPending={resendVerification.isPending}
                            resendSuccess={resendVerification.isSuccess}
                            resendIsError={resendVerification.isError}
                            resendError={resendVerification.error?.message}
                            onResend={() => resendVerification.mutate()}
                            onLogin={() => router.navigate({ to: '/login' })}
                        />
                    ) : (
                        <PendingState
                            isAuthenticated={isAuthenticated}
                            resendPending={resendVerification.isPending}
                            resendSuccess={resendVerification.isSuccess}
                            resendIsError={resendVerification.isError}
                            resendError={resendVerification.error?.message}
                            onResend={() => resendVerification.mutate()}
                        />
                    )}
                </div>
            </main>

            <UnauthorizedFooter />
        </div>
    )
}

/* ── No-token state: shown right after registration ───────────────────────── */
function PendingState({
    isAuthenticated,
    resendPending,
    resendSuccess,
    resendIsError,
    resendError,
    onResend,
}: {
    isAuthenticated: boolean
    resendPending: boolean
    resendSuccess: boolean
    resendIsError: boolean
    resendError?: string
    onResend: () => void
}) {
    return (
        <div className="island-shell rounded-2xl p-10 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center">
                <Mail className="w-8 h-8 text-accent" />
            </div>

            <div className="space-y-2">
                <Heading as="h1">Please verify your email</Heading>
                <Body className="text-ink-soft max-w-sm mx-auto">
                    We sent a verification link to your registered email address. Click the link to activate your account.
                </Body>
            </div>

            {resendSuccess ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-muted border border-accent/20 text-sm text-ink">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                    Verification email sent — check your inbox.
                </div>
            ) : (
                <>
                    <Button
                        onClick={onResend}
                        disabled={resendPending || !isAuthenticated}
                        className="w-full"
                    >
                        {resendPending ? 'Sending…' : 'Resend verification email'}
                    </Button>
                    {resendIsError && (
                        <p className="text-xs text-destructive">{resendError ?? 'Failed to send email. Please try again.'}</p>
                    )}
                </>
            )}

            <Muted className="text-xs text-ink-soft">
                Didn't receive it? Check your spam folder or ensure your address was entered correctly.
            </Muted>
        </div>
    )
}

/* ── Token states: loading / success / error ──────────────────────────────── */
function TokenState({
    isPending,
    isSuccess,
    isError,
    errorMessage,
    isAuthenticated,
    resendPending,
    resendSuccess,
    resendIsError,
    resendError,
    onResend,
    onLogin,
}: {
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    errorMessage?: string
    isAuthenticated: boolean
    resendPending: boolean
    resendSuccess: boolean
    resendIsError: boolean
    resendError?: string
    onResend: () => void
    onLogin: () => void
}) {
    if (isPending) {
        return (
            <div className="island-shell rounded-2xl p-10 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
                <div className="space-y-2">
                    <Heading as="h1">Verifying your email…</Heading>
                    <Body className="text-ink-soft">Please wait while we confirm your email address.</Body>
                </div>
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="island-shell rounded-2xl p-10 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <div className="space-y-2">
                    <Heading as="h1">Email successfully verified!</Heading>
                    <Body className="text-ink-soft">
                        You will be automatically redirected to your dashboard in a few seconds.
                    </Body>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="island-shell rounded-2xl p-10 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <Heading as="h1">Verification failed</Heading>
                    <Body className="text-ink-soft">
                        {errorMessage ?? 'This link has expired or is invalid. Please request a new one.'}
                    </Body>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    {resendSuccess ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-muted border border-accent/20 text-sm text-ink">
                            <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                            Verification email sent — check your inbox.
                        </div>
                    ) : (
                        <>
                            <Button
                                onClick={onResend}
                                disabled={resendPending || !isAuthenticated}
                            >
                                {resendPending ? 'Sending…' : 'Resend verification email'}
                            </Button>
                            {resendIsError && (
                                <p className="text-xs text-destructive">{resendError ?? 'Failed to send email. Please try again.'}</p>
                            )}
                        </>
                    )}
                    <Button variant="outline" onClick={onLogin}>
                        Return to login
                    </Button>
                </div>
            </div>
        )
    }

    return null
}