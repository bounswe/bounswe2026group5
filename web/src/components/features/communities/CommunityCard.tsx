import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommunityTag } from '@/lib/queries/CommunityQueries.ts'

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
]

interface CommunityCardProps {
    community: CommunityTag
    isMember?: boolean
    className?: string
    onViewCommunity?: (id: string) => void
    onJoin?: (id: string) => void
    onLeave?: (id: string) => void
    isJoining?: boolean
    isLeaving?: boolean
}

function CommunityAvatar({ name }: { name: string }) {
    const initials = (name || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()

    const colorClass = AVATAR_COLORS[name.length % AVATAR_COLORS.length]

    return (
        <div
            className={cn(
                'h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 border border-white/50 shadow-sm',
                colorClass,
            )}
        >
            {initials}
        </div>
    )
}

export function CommunityCard({
    community,
    isMember = false,
    className,
    onViewCommunity,
    onJoin,
    onLeave,
    isJoining = false,
    isLeaving = false,
}: Readonly<CommunityCardProps>) {
    return (
        <div
            className={cn(
                'island-shell rounded-xl p-8 flex flex-col gap-5 shadow-md hover:shadow-xl/30',
                className,
            )}
        >
            {/* Header: Avatar + Name + Member count */}
            <div className="flex items-center gap-4">
                <CommunityAvatar name={community.name} />
                <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold text-ink leading-tight truncate">
                        {community.name}
                    </h3>
                    <p className="flex items-center gap-1.5 text-ink-soft text-sm mt-1">
                        <Users className="h-3.5 w-3.5" />
                        {community.member_count.toLocaleString()} member{community.member_count !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Description */}
            <p className="text-ink-soft text-sm leading-relaxed line-clamp-3 flex-1">
                {community.description || 'No description yet.'}
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
                <Button
                    className="w-full bg-accent hover:bg-accent-light text-white shadow-sm"
                    size="sm"
                    onClick={() => onViewCommunity?.(community.slug)}
                >
                    View
                </Button>
                {isMember ? (
                    <Button
                        variant="outline"
                        className="w-full border-line text-ink-soft hover:text-red-600 hover:border-red-300 bg-mist hover:bg-red-50"
                        size="sm"
                        disabled={isLeaving}
                        onClick={() => onLeave?.(community.id)}
                    >
                        {isLeaving ? 'Leaving...' : 'Leave'}
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-line text-ink-soft hover:text-ink hover:border-accent/30 bg-mist hover:bg-accent/20"
                        size="sm"
                        disabled={isJoining}
                        onClick={() => onJoin?.(community.id)}
                    >
                        {isJoining ? 'Joining...' : 'Join'}
                    </Button>
                )}
            </div>
        </div>
    )
}
