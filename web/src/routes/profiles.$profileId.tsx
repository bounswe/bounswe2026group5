import { Link, createFileRoute } from '@tanstack/react-router'
import { ProfilePageView } from '@/components/profile/ProfilePageView'
import { getMockProfileById } from '@/lib/mocks/profiles'
import { isAuthenticated } from '@/lib/demoAuth'
import { AuthorizedHeader } from '@/components/layout/AuthorizedHeader'
import { UnauthorizedHeader } from '@/components/layout/UnauthorizedHeader'
import { UnauthorizedFooter } from '@/components/layout/UnauthorizedFooter'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/profiles/$profileId')({
  component: PublicProfileRoute,
})

/**
 * Public profile detail route with auth-aware chrome.
 */
function PublicProfileRoute() {
  const { profileId } = Route.useParams()
  const profile = getMockProfileById(profileId)
  const signedIn = isAuthenticated()

  if (!profile) {
    return (
      <main className="page-wrap py-16">
        <section className="island-shell rounded-2xl p-8 text-center space-y-3">
          <h1 className="text-2xl font-semibold text-ink">Profile not found</h1>
          <p className="text-ink-soft">
            The profile you requested does not exist yet in local mock data.
          </p>
          <div className="pt-2">
            {signedIn ? (
              <Link to="/dashboard" search={{ mode: 'mentee' }}>
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline">Back to Login</Button>
              </Link>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (signedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-black/2 dark:bg-background">
        <AuthorizedHeader />
        <ProfilePageView
          profile={profile}
          isOwner={false}
          isAuthenticatedViewer={true}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <UnauthorizedHeader />
      <ProfilePageView
        profile={profile}
        isOwner={false}
        isAuthenticatedViewer={false}
      />
      <UnauthorizedFooter />
    </div>
  )
}
