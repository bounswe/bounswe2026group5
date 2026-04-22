import { Button } from '@/components/ui/button'
import { Body } from '@/components/Typography'
import { cn } from '@/lib/utils'
import type { PublicMentorProfile } from '@/lib/queries/DiscoverQueries.ts'

interface ProfileCardProps {
  profile: PublicMentorProfile
  className?: string
  onViewProfile?: (id: string) => void
  onSendMessage?: (id: string) => void
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
]

function ProfileAvatar({
                         displayName,
                         pictureUrl,
                       }: Readonly<{ displayName: string; pictureUrl: string | null }>) {
  const initials = (displayName || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

  const colorClass = AVATAR_COLORS[displayName.length % AVATAR_COLORS.length]

  if (pictureUrl) {
    return (
        <img
            src={pictureUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover shrink-0 border border-line shadow-sm"
        />
    )
  }

  return (
      <div
          className={cn(
              'h-20 w-20 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border border-white/50 shadow-sm',
              colorClass,
          )}
      >
        {initials}
      </div>
  )
}

export function ProfileCard({
                              profile,
                              className,
                              onViewProfile,
                              onSendMessage,
                            }: Readonly<ProfileCardProps>) {
  return (
      <div
          className={cn(
              'island-shell rounded-xl p-8 flex flex-col gap-6 shadow-md hover:shadow-xl/30',
              className,
          )}
      >
        {/* Header: Avatar + Name + Title */}
        <div className="flex items-center gap-4">
          <ProfileAvatar
              displayName={profile.full_name}
              pictureUrl={profile.picture_url}
          />
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold text-ink leading-tight truncate">
              {profile.full_name}
            </h3>
            <p className="text-accent font-medium text-sm mt-0.5">{profile.title}</p>
          </div>
        </div>

        {/* Expertises */}
        <div className="px-6 pb-6 pt-2 flex flex-wrap gap-2 text-sm z-10 relative">
          {profile.skills?.slice(0, 3).map((skill) => (
            <span
              key={skill}
                  className="px-3 py-1 bg-accent-muted text-accent text-xs font-bold uppercase tracking-wider rounded-full"
              >
            {skill}
          </span>
          ))}
        </div>

        {/* Bio */}
        <Body className="text-ink-soft leading-relaxed line-clamp-2 flex-1">
          {profile.bio}
        </Body>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <Button
              className="w-full bg-accent hover:bg-accent-light text-white shadow-sm"
              size="sm"
              onClick={() => onViewProfile?.(profile.username)}
          >
            View Profile
          </Button>
          <Button
              variant="outline"
              className="w-full flex-1 min-w-0 truncate border-line text-ink-soft hover:text-ink hover:border-accent/30 bg-mist hover:bg-accent/20"
              size="sm"
              onClick={() => onSendMessage?.(profile.username)}
          >
            Send Message
          </Button>
        </div>
      </div>
  )
}