import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Display, Heading, Body, Muted } from '@/components/Typography'
import { forgotPasswordFn } from '#/lib/queries/AuthQueries.ts'

export const Route = createFileRoute('/_unauthorized/forgot-password')({
    component: ForgotPasswordPage,
})

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const forgotPassword = useMutation({
        mutationFn: forgotPasswordFn,
        onSettled: () => {
            // Always show success regardless of outcome — prevent account enumeration
            setSubmitted(true)
        },
    })

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        forgotPassword.mutate({ email })
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[5fr_4fr]">
            <aside className="hidden lg:flex flex-col px-14 py-12 bg-petal border-r border-line">
                <Display className="mb-10">Campus Tutor</Display>
                <div className="island-shell rounded-2xl px-8 py-10 space-y-6 min-h-3/4 rise-in">
                    <Body className="island-kicker">Account Recovery</Body>
                    <Display as="h2" className="leading-[1.2] max-w-xs">
                        Locked out?<br />We've got you.
                    </Display>
                    <Body className="text-ink-soft max-w-90">
                        Enter your email address and we'll send you a secure link to
                        reset your password. The link expires in 30 minutes.
                    </Body>
                    <div className="flex items-start gap-3 pt-4">
                        <span className="w-12 h-12 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                            <Mail className="w-6 h-6 text-accent" strokeWidth={2.5} />
                        </span>
                        <div>
                            <Body className="font-medium text-ink">Check your inbox</Body>
                            <Muted className="text-ink-soft">
                                The reset link will arrive within a few minutes.
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
                        <Heading as="h2" className="mb-2 mt-6">Forgot Password</Heading>
                        <Muted className="text-ink-soft">
                            Enter your email address and we'll send you a secure link to reset your password.
                        </Muted>
                    </div>

                    <Card className="w-full island-shell border-line">
                        <CardHeader>
                            <CardTitle>Reset your password</CardTitle>
                            <CardDescription>
                                We'll email you a link that expires in 30 minutes.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {submitted ? (
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-muted border border-accent/20">
                                    <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                                    <p className="text-sm text-ink">
                                        If an account exists for that email, a reset link has been sent to your inbox.
                                        Please check your spam folder if you don't see it.
                                    </p>
                                </div>
                            ) : (
                                <form
                                    id="forgot-password-form"
                                    className="flex flex-col gap-5"
                                    onSubmit={handleSubmit}
                                >
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@university.edu"
                                            required
                                        />
                                    </div>
                                </form>
                            )}
                        </CardContent>

                        <CardFooter className="flex-col gap-3">
                            {!submitted && (
                                <Button
                                    type="submit"
                                    form="forgot-password-form"
                                    className="w-full"
                                    disabled={forgotPassword.isPending}
                                >
                                    {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
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