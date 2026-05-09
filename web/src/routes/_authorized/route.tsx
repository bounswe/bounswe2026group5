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
            <AuthorizedHeader />
            <EmailVerificationBanner />
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    )
}
