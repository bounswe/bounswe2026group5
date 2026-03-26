// web/src/components/features/discover/ProfileCard.tsx
import { Button } from '@/components/ui/button'
import { Body } from '@/components/Typography'
import { cn } from '@/lib/utils'
import type { DiscoverProfile } from '@/lib/mocks/discover'

interface ProfileCardProps {
  profile: DiscoverProfile
  className?: string
  /** Wire up to navigate to /:userId/profile once profile routes exist */
  onViewProfile?: (id: string) => void
  /** Wire up to open a message compose modal once messaging is implemented */
  onSendMessage?: (id: string) => void
}

function ProfileAvatar({
  name,
  avatarUrl,
}: Readonly<{
  name: string
  avatarUrl?: string
}>) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-20 w-20 rounded-full object-cover shrink-0 border border-line shadow-sm"
      />
    )
  }

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
  ]
  const colorClass = colors[name.length % colors.length]

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
}: ProfileCardProps) {
  return (
    <div
      className={cn(
        'island-shell bg-white rounded-xl p-8 flex flex-col gap-6 shadow-md hover:shadow-xl/30',
        className,
      )}
    >
      {/* Header: Avatar + Name + Title */}
      <div className="flex items-center gap-4">
        <ProfileAvatar name={profile.name} avatarUrl={profile.avatarUrl} />
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold text-ink leading-tight truncate">
            {profile.name}
          </h3>
          <p className="text-accent font-medium text-sm mt-0.5">{profile.title}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2">
        {profile.skills.map((skill) => (
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
          onClick={() => onViewProfile?.(profile.id)}
        >
          View Profile
        </Button>
        <Button
          variant="outline"
          className="w-full flex-1 min-w-0 truncate border-line text-ink-soft hover:text-ink hover:border-accent/30 bg-white hover:bg-accent/20"
          size="sm"
          onClick={() => onSendMessage?.(profile.id)}
        >
          Send Message
        </Button>
      </div>
    </div>
  )
}