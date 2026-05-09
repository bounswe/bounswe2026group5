import { Body, Display, Heading, Muted } from "@/components/Typography"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useGoogleLogin } from '@react-oauth/google'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { CalendarDays, Search, TrendingUp } from 'lucide-react'

import { requestForToken } from "#/lib/firebase-client"
import { googleLoginFn, handleAuthSuccess, loginFn } from "#/lib/queries/AuthQueries.ts"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"

const FEATURES = [
    { icon: Search,      title: 'Find tutors',    desc: 'Browse verified tutors from your campus' },
    { icon: CalendarDays, title: 'Book sessions', desc: 'Schedule around your timetable'          },
    { icon: TrendingUp,  title: 'Track progress', desc: 'See your grade improvements over time'   },
]

export const Route = createFileRoute('/_unauthorized/login')({
    component: LoginPage,
})

export function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const login = useMutation({
        mutationFn: loginFn,
        onSuccess: (data) => {
            handleAuthSuccess(data)
            // Trigger prompt asynchronously (don't await)
            requestForToken(true).catch(() => {})
            router.navigate({
                to: '/dashboard',
            })
        }
    })

    const googleLogin = useMutation({
        mutationFn: googleLoginFn,
        onSuccess: (data) => {
            handleAuthSuccess(data)
            // Trigger prompt asynchronously (don't await)
            requestForToken(true).catch(() => {})
            router.navigate({
                to: '/dashboard',
            })
        }
    })

    /**
     * Note: useGoogleLogin typically returns an access_token.
     * To get an id_token with a custom button, we use the standard popup logic.
     */
    const triggerGoogleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            // If backend is strictly expecting an ID Token (JWT),
            // we should ideally use the <GoogleLogin> component or handle the implicit flow.
            // For now, we pass the access_token or credential if available.
            if (tokenResponse.access_token) {
                googleLogin.mutate(tokenResponse.access_token)
            }
        },
        onError: () => console.error('Google Login Failed'),
    })

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        login.mutate({ email, password })
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[5fr_4fr]">

            <aside className="lg:flex flex-col px-14 py-12 bg-petal border-r border-line">
                <Display className="mb-10">Neighborship</Display>
                <div className="island-shell rounded-2xl px-8 py-10 space-y-6 min-h-3/4 rise-in">
                    <Body className="island-kicker">Peer tutoring platform</Body>
                    <Display as="h2" className="leading-[1.2] max-w-xs">
                        Study better,<br />together.
                    </Display>
                    <Body className="text-(--color-brand-ink-soft) max-w-90">
                        Find mentors from your own campus, book sessions around your
                        schedule, and actually understand the material.
                    </Body>
                    <ul className="flex flex-col gap-6">
                        {FEATURES.map(({ icon: Icon, title, desc }) => (
                            <li key={title} className="flex items-start gap-3">
                              <span className="w-12 h-12 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                                <Icon className="w-6 h-6 text-accent" strokeWidth={2.5} />
                              </span>
                                <div>
                                    <Body className="font-medium text-ink">{title}</Body>
                                    <Muted className="text-ink-soft">{desc}</Muted>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            <main className="flex flex-col justify-start items-center px-6 py-16 sm:px-12">
                <div className="w-full max-w-lg rise-in">

                    <div className="mb-6 px-1">
                        <Heading as="h2" className="mb-10">Welcome back</Heading>
                    </div>

                    <Card className="w-full island-shell border-line">
                        <CardHeader>
                            <CardTitle>Login to your account</CardTitle>
                            <CardDescription>
                                Enter your email below to login to your account
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form
                                id="login-form"
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

                                <div className="grid gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-accent-light underline-offset-4 hover:underline hover:text-accent transition-colors"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </form>
                        </CardContent>

                        <CardFooter className="flex-col gap-3">
                            {/* THE REAL FORM SUBMIT BUTTON */}
                            <Button type="submit" form="login-form" className="w-full" disabled={login.isPending}>
                                {login.isPending ? 'Signing in...' : 'Sign in'}
                            </Button>

                            {login.isError && (
                                <p className="text-xs text-destructive">{login.error.message}</p>
                            )}

                            {googleLogin.isError && (
                                <p className="text-xs text-destructive">{googleLogin.error.message}</p>
                            )}

                            <div className="flex items-center gap-3 w-full mt-2">
                                <div className="flex-1 h-px bg-(--color-brand-line)" />
                                <Muted as="span" className="text-xs uppercase tracking-widest">or</Muted>
                                <div className="flex-1 h-px bg-(--color-brand-line)" />
                            </div>

                            <Button
                                variant="outline"
                                className="w-full gap-2 border-line"
                                onClick={() => triggerGoogleLogin()}
                                disabled={googleLogin.isPending}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {googleLogin.isPending ? 'Logging in...' : 'Continue with Google'}
                            </Button>

                            <Muted className="text-xs text-center w-full">
                                No account yet?{' '}
                                <Link
                                    to="/register"
                                    className="font-medium text-accent-light underline-offset-4 hover:underline hover:text-accent transition-colors"
                                >
                                    Sign up free
                                </Link>
                            </Muted>
                        </CardFooter>
                    </Card>

                </div>
            </main>
        </div>
    )
}