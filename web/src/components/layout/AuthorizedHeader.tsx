import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { logout, meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { useQuery } from "@tanstack/react-query"
import { useProfile } from "#/lib/queries/ProfileQueries.ts"
import { getInitials } from "#/lib/utils.ts"
import { useNotifications } from "#/lib/queries/NotificationQueries.ts"

export function AuthorizedHeader() {
  const { data: me } = useQuery(meQueryOptions)
  const { data: profile } = useProfile(me?.username ?? '')
  const { data: notifications = [] } = useNotifications()

  const hasUnread = notifications.some(n => !n.is_read && n.type !== 'new_message')
  const hasMessageNotification = notifications.some(n => n.type === 'new_message' && !n.is_read)

  const initials = profile?.full_name
      ? getInitials(profile.full_name)
      : me?.username
          ? me.username.slice(0, 2).toUpperCase()
          : '??'

  return (
      <header className="sticky top-0 z-50 w-full border-b border-line bg-header-bg backdrop-blur-md">
        <div className="page-wrap flex h-14 items-center justify-between">

          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link
                to="/dashboard"
                className="font-bold font-display tracking-tight text-lg text-ink"
            >
              Mentorship
            </Link>

            <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
              <Link
                  to="/dashboard"
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                <span className="relative">
                  Dashboard
                  {hasUnread && (
                    <span className="absolute -top-1 -right-2.5 h-2 w-2 rounded-full bg-accent" />
                  )}
                </span>
              </Link>
              <Link
                  to="/schedule"
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                Schedule
              </Link>
              <Link
                  to="/discover"
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                Discover
              </Link>
              <Link
                  to="/communities"
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                Communities
              </Link>
              <Link
                  to="/connections"
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                Connections
              </Link>
              <Link
                  to="/messages"
                  search={{ conversationId: '' }}
                  activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                  className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
              >
                <span className="relative">
                  Messages
                  {hasMessageNotification && (
                    <span className="absolute -top-1 -right-2.5 h-2 w-2 rounded-full bg-accent" />
                  )}
                </span>
              </Link>
              {me?.role === 'ADMIN' && (
                <Link
                    to="/admin-moderation"
                    activeProps={{ className: "bg-accent-muted text-ink font-semibold" }}
                    className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right: Profile & Actions */}
          <div className="flex items-center gap-3">
            <Link
                to="/profiles/$username"
                params={{ username: me?.username ?? '' }}
                aria-label="Open profile page"
                className="h-8 w-8 rounded-full bg-accent text-background flex items-center justify-center text-sm font-bold shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {initials}
            </Link>
            <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-sm text-ink-soft hover:text-ink px-2 hidden md:inline-flex"
            >
              Sign out
            </Button>
          </div>

        </div>
      </header>
  )
}