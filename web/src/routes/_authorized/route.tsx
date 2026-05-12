import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import { getStoredUser, meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'

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

function AuthorizedLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-bg dark:bg-background">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
            >
                Skip to main content
            </a>
            <AuthorizedHeader />
            <EmailVerificationBanner />
            <main id="main-content" className="flex-1">
                <Outlet />
            </main>
        </div>
    )
}
