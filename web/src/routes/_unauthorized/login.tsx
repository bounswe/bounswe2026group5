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
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { CalendarDays, Search, TrendingUp } from 'lucide-react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'

import { handleAuthSuccess, loginFn, googleLoginFn } from "#/lib/queries/AuthQueries.ts"
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
            router.navigate({
                to: '/dashboard',
            })
        }
    })

    const googleLogin = useMutation({
        mutationFn: googleLoginFn,
        onSuccess: (data) => {
            handleAuthSuccess(data)
            router.navigate({
                to: '/dashboard',
            })
        }
    })

    const handleGoogleSuccess = (response: CredentialResponse) => {
        if (response.credential) {
            googleLogin.mutate(response.credential)
        }
    }

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        login.mutate({ email, password })
    }
    return (
        <div className="grid min-h-screen lg:grid-cols-[5fr_4fr]">

            <aside className="lg:flex flex-col px-14 py-12 bg-petal border-r border-line">
                <Display className="mb-10">Campus Tutor</Display>
                <div className="island-shell rounded-2xl px-8 py-10 space-y-6 min-h-3/4 rise-in">
                    <Body className="island-kicker">Peer tutoring platform</Body>
                    <Display as="h2" className="leading-[1.2] max-w-xs">
                        Study better,<br />together.
                    </Display>
                    <Body className="text-(--color-brand-ink-soft) max-w-90">
                        Find tutors from your own campus, book sessions around your
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
                                        <a
                                            href="#"
                                            className="text-xs text-accent-light underline-offset-4 hover:underline hover:text-accent transition-colors"
                                        >
                                            Forgot your password?
                                        </a>
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

                            <div className="w-full flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        console.error('Google Login Failed')
                                    }}
                                    text="continue_with"
                                    shape="rectangular"
                                    width="400"
                                    theme="outline"
                                />
                            </div>

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