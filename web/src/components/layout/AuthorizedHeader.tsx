import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { logout, meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { useQuery } from "@tanstack/react-query"
import { useProfile } from "#/lib/queries/ProfileQueries.ts"
import { getAbsoluteMediaUrl, getInitials } from "#/lib/utils.ts"
import { useNotifications } from "#/lib/queries/NotificationQueries.ts"

export function AuthorizedHeader() {
  const { data: me } = useQuery(meQueryOptions)
  const { data: profile } = useProfile(me?.username ?? '')
  const { data: notifications = [] } = useNotifications()

  const unreadCount = notifications.filter(n => !n.is_read && n.type !== 'new_message').length
  const unreadMessageCount = notifications.filter(n => n.type === 'new_message' && !n.is_read).length
  const hasUnread = unreadCount > 0
  const hasMessageNotification = unreadMessageCount > 0

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
              Neighborship
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
                    <span className="absolute -top-2 -right-3.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                      <span className="sr-only"> unread notifications</span>
                    </span>
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
                    <span className="absolute -top-2 -right-3.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      <span className="sr-only"> unread messages</span>
                    </span>
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
                aria-label={`${profile?.full_name ?? me?.username ?? 'My'} profile`}
                className="h-8 w-8 rounded-full overflow-hidden bg-accent text-background flex items-center justify-center text-sm font-bold shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {profile?.picture_url
                ? <img src={getAbsoluteMediaUrl(profile.picture_url)} alt={initials} className="h-full w-full object-cover" />
                : initials}
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