import { clearAuthState, resetPasswordFn } from '#/lib/queries/AuthQueries.ts'
import { Body, Display, Heading, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, KeyRound, XCircle } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_unauthorized/reset-password')({
    component: ResetPasswordPage,
})

export function ResetPasswordPage() {
    // URLSearchParams correctly handles `=` padding characters inside the token value.
    // TanStack Router's default search parser splits on every `=`, truncating base64 tokens.
    const token = new URLSearchParams(globalThis.location.search).get('token') ?? ''
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    const resetPassword = useMutation({
        mutationFn: resetPasswordFn,
        onSuccess: () => {
            clearAuthState()
            setTimeout(() => router.navigate({ to: '/login' }), 2000)
        },
    })

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="w-full max-w-md text-center space-y-4">
                    <XCircle className="w-12 h-12 text-destructive mx-auto" />
                    <Heading as="h2">Invalid Reset Link</Heading>
                    <Muted className="text-ink-soft">
                        This link is missing a reset token. Please request a new one.
                    </Muted>
                    <Button asChild className="mt-2">
                        <Link to="/forgot-password">Request New Link</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        setValidationError(null)

        if (password.length < 8) {
            setValidationError('Password must be at least 8 characters.')
            return
        }
        if (password !== confirmPassword) {
            setValidationError('Passwords do not match.')
            return
        }

        resetPassword.mutate({ token, new_password: password, confirm_password: confirmPassword })
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[5fr_4fr]">
            <aside className="hidden lg:flex flex-col px-14 py-12 bg-petal border-r border-line">
                <Display className="mb-10">Neighborship</Display>
                <div className="island-shell rounded-2xl px-8 py-10 space-y-6 min-h-3/4 rise-in">
                    <Body className="island-kicker">Account Recovery</Body>
                    <Display as="h2" className="leading-[1.2] max-w-xs">
                        Create a new<br />password.
                    </Display>
                    <Body className="text-ink-soft max-w-90">
                        Choose a strong password that you haven't used before.
                        For your security, all active sessions will be signed out.
                    </Body>
                    <div className="flex items-start gap-3 pt-4">
                        <span className="w-12 h-12 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                            <KeyRound className="w-6 h-6 text-accent" strokeWidth={2.5} />
                        </span>
                        <div>
                            <Body className="font-medium text-ink">Sessions will be cleared</Body>
                            <Muted className="text-ink-soft">
                                All existing sessions are signed out after a successful reset.
                            </Muted>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex flex-col justify-start items-center px-6 py-16 sm:px-12">
                <div className="w-full max-w-lg rise-in">
                    <div className="mb-6 px-1">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-ink-soft hover:text-accent transition-colors mb-8 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium uppercase tracking-wider">Back to Login</span>
                        </Link>
                        <Heading as="h2" className="mb-2 mt-6">Reset Password</Heading>
                        <Muted className="text-ink-soft">
                            Enter and confirm your new password below.
                        </Muted>
                    </div>

                    <Card className="w-full island-shell border-line">
                        <CardHeader>
                            <CardTitle>Choose a new password</CardTitle>
                            <CardDescription>
                                Must be at least 8 characters. All active sessions will be signed out.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {resetPassword.isSuccess ? (
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-muted border border-accent/20">
                                    <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                                    <p className="text-sm text-ink">
                                        Password reset successfully. Redirecting you to the login page…
                                    </p>
                                </div>
                            ) : (
                                <form
                                    id="reset-password-form"
                                    className="flex flex-col gap-5"
                                    onSubmit={handleSubmit}
                                >
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                        />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>

                                    {validationError && (
                                        <p className="text-xs text-destructive">{validationError}</p>
                                    )}
                                </form>
                            )}

                            {resetPassword.isError && !resetPassword.isSuccess && (
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
                                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                    <div className="text-sm text-destructive">
                                        <p className="font-medium">{resetPassword.error?.message ?? 'Something went wrong.'}</p>
                                        {resetPassword.error?.message?.toLowerCase().includes('token') && (
                                            <p className="mt-0.5 text-xs">
                                                Please{' '}
                                                <Link
                                                    to="/forgot-password"
                                                    className="underline underline-offset-4 hover:text-destructive/80 transition-colors"
                                                >
                                                    request a new reset link
                                                </Link>
                                                .
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex-col gap-3">
                            {!resetPassword.isSuccess && (
                                <Button
                                    type="submit"
                                    form="reset-password-form"
                                    className="w-full"
                                    disabled={resetPassword.isPending}
                                >
                                    {resetPassword.isPending ? 'Resetting…' : 'Reset Password'}
                                </Button>
                            )}
                            <Muted className="text-xs text-center w-full">
                                Remembered your password?{' '}
                                <Link
                                    to="/login"
                                    className="font-medium text-accent-light underline-offset-4 hover:underline hover:text-accent transition-colors"
                                >
                                    Sign in
                                </Link>
                            </Muted>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    )
}