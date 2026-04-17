import { createFileRoute, Link } from '@tanstack/react-router'
import { useProfile, isMentorProfile } from '#/lib/queries/ProfileQueries.ts'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { ProfilePageView } from '@/components/profile/ProfilePageView'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import { UnauthorizedHeader } from '@/components/layout/UnauthorizedHeader'
import { UnauthorizedFooter } from '@/components/layout/UnauthorizedFooter'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/profiles/$username')({
    component: PublicProfileRoute,
})

function PublicProfileRoute() {
    const { username } = Route.useParams()

    const { data: me } = useQuery(meQueryOptions)
    const { data: profile, isLoading, isError } = useProfile(username)

    const isAuthenticated = !!me
    const header = isAuthenticated ? <AuthorizedHeader /> : <UnauthorizedHeader />
    const footer = isAuthenticated ? null : <UnauthorizedFooter />

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col">
                {header}
                <main className="page-wrap py-16 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </main>
                {footer}
            </div>
        )
    }

    if (isError || !profile) {
        return (
            <div className="flex min-h-screen flex-col">
                {header}
                <main className="page-wrap py-16">
                    <section className="island-shell rounded-2xl p-8 text-center space-y-3">
                        <h1 className="text-2xl font-semibold text-ink">Profile not found</h1>
                        <p className="text-ink-soft">This profile does not exist or could not be loaded.</p>
                        <div className="pt-2">
                            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
                                <Button variant="outline">
                                    {isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
                                </Button>
                            </Link>
                        </div>
                    </section>
                </main>
                {footer}
            </div>
        )
    }

    const mappedProfile = isMentorProfile(profile)
        ? {
            isMentor: true as const,
            full_name: profile.full_name,
            bio: profile.bio,
            hidden: profile.hidden,
            picture_url: profile.picture_url,
            title: profile.title,
            skills: profile.skills ?? [],
            rating: profile.rating,
            total_mentee_count: profile.total_mentee_count,
            username: username,
        }
        : {
            isMentor: false as const,
            full_name: profile.full_name,
            bio: profile.bio,
            hidden: profile.hidden,
            picture_url: profile.picture_url,
            skills: profile.skills ?? [],
            username: username
        }

    console.log('profile from cache:', profile)

    return (
        <div className="flex min-h-screen flex-col">
            {header}
            <ProfilePageView
                profile={mappedProfile}
                isOwner={me?.username === username}
                isAuthenticatedViewer={isAuthenticated}
            />
            {footer}
        </div>
    )
}