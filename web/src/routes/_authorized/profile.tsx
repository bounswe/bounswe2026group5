import { createFileRoute } from '@tanstack/react-router'
import { ProfilePageView } from '@/components/profile/ProfilePageView'
import { getCurrentMockProfile } from '@/lib/mocks/profiles'

export const Route = createFileRoute('/_authorized/profile')({
  component: AuthorizedProfileRoute,
})

/**
 * Profile page for the authenticated user.
 */
function AuthorizedProfileRoute() {
  const profile = getCurrentMockProfile()

  return (
    <ProfilePageView
      profile={profile}
      isOwner={true}
      isAuthenticatedViewer={true}
    />
  )
}
