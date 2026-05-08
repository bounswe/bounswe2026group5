// web/src/routes/_authorized/route.tsx
import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import { getStoredUser, meQueryOptions, resendVerificationEmailFn } from "#/lib/queries/AuthQueries.ts"
import { Toaster } from "#/components/ui/sonner.tsx"
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

export const Route = createFileRoute('/_authorized')({
    beforeLoad: () => {
        const user = getStoredUser()
        if (!user) throw redirect({ to: '/login' })
    },
    loader: async ({ context }) => {
        const me = await context.queryClient.ensureQueryData(meQueryOptions)
        if (me && !me.app_usage_mode && me.role !== 'ADMIN') {
            throw redirect({ to: '/gettingToKnowYou' })
        }
        return me
    },
    component: AuthorizedLayout,
})

function EmailVerificationBanner() {
    const { data: me } = useQuery(meQueryOptions)
    const [dismissed, setDismissed] = useState(false)

    const resend = useMutation({ mutationFn: resendVerificationEmailFn })

    if (dismissed || me?.is_email_verified !== false) return null

    return (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5">
            <div className="page-wrap flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                        Please verify your email address to unlock all features.{' '}
                        <Link to="/verify-email" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                            Learn more
                        </Link>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {resend.isSuccess ? (
                        <span className="flex items-center gap-1 text-xs text-amber-700">
                            <CheckCircle className="w-3.5 h-3.5" /> Email sent
                        </span>
                    ) : (
                        <button
                            onClick={() => resend.mutate()}
                            disabled={resend.isPending}
                            className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
                        >
                            {resend.isPending ? 'Sending…' : 'Resend email'}
                        </button>
                    )}
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

function AuthorizedLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-black/2 dark:bg-background">
            <AuthorizedHeader />
            <EmailVerificationBanner />
            <main className="flex-1">
                <Outlet />
            </main>
            <Toaster position="bottom-right" toastOptions={{ classNames: { toast: 'cn-toast' } }} style={{ zIndex: 9999 }} />
        </div>
    )
}
