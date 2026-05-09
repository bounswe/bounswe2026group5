import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import { UnauthorizedHeader } from '@/components/layout/UnauthorizedHeader'
import { UnauthorizedFooter } from '@/components/layout/UnauthorizedFooter'

export const Route = createFileRoute('/_public')({
    component: PublicLayout,
})

function PublicLayout() {
    const { data: me } = useQuery(meQueryOptions)
    return (
        <div className="flex min-h-screen flex-col bg-black/[0.02] dark:bg-background">
            {me ? <AuthorizedHeader /> : <UnauthorizedHeader />}
            <main className="flex-1">
                <Outlet />
            </main>
            {!me && <UnauthorizedFooter />}
        </div>
    )
}
