import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Display, Muted } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import {
    communityDetailQueryOptions,
    communityMembersQueryOptions,
    useJoinCommunityMutation,
    useLeaveCommunityMutation,
} from '@/lib/queries/CommunityQueries.ts'
import { meQueryOptions } from '@/lib/queries/AuthQueries.ts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
]

const MEMBERS_PAGE_SIZE = 9

export const Route = createFileRoute('/_authorized/communities/$communityId')({
    component: CommunityDetailPage,
})

export function CommunityDetailPage() {
    const { communityId } = Route.useParams()
    const navigate = useNavigate()
    const [membersPage, setMembersPage] = useState(1)
    const [isJoining, setIsJoining] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)

    const { data: me } = useQuery(meQueryOptions)
    const { data: community, isLoading } = useQuery(communityDetailQueryOptions(communityId))
    const { data: membersData } = useQuery(
        communityMembersQueryOptions(communityId, membersPage, MEMBERS_PAGE_SIZE),
    )

    const joinMutation = useJoinCommunityMutation()
    const leaveMutation = useLeaveCommunityMutation()

    const isMember = community?.is_member ?? false
    const members = membersData?.results ?? []
    const totalMembers = membersData?.count ?? 0
    const totalPages = Math.ceil(totalMembers / MEMBERS_PAGE_SIZE)

    const handleJoin = async () => {
        setIsJoining(true)
        try {
            await joinMutation.mutateAsync(communityId)
            toast.success('Joined community!')
        } catch {
            toast.error('Failed to join community.')
        } finally {
            setIsJoining(false)
        }
    }

    const handleLeave = async () => {
        setIsLeaving(true)
        try {
            await leaveMutation.mutateAsync(communityId)
            toast.success('Left community.')
        } catch {
            toast.error('Failed to leave community.')
        } finally {
            setIsLeaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="page-wrap py-24 text-center text-ink-soft text-lg">
                Loading community…
            </div>
        )
    }

    if (!community) {
        return (
            <div className="page-wrap py-24 text-center">
                <p className="text-ink-soft text-lg">Community not found.</p>
                <Link to="/communities" className="text-accent hover:underline text-sm mt-2 block">
                    ← Back to Communities
                </Link>
            </div>
        )
    }

    const colorClass = AVATAR_COLORS[community.name.length % AVATAR_COLORS.length]
    const initials = community.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()

    return (
        <div className="py-10 sm:py-16 rise-in flex flex-col gap-12">

            {/* ── Back link ───────────────────────────────────────────────── */}
            <div className="page-wrap">
                <Link
                    to="/communities"
                    className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Communities
                </Link>
            </div>

            {/* ── Community Header ────────────────────────────────────────── */}
            <div className="page-wrap">
                <div className="island-shell rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-start gap-8 shadow-md">
                    {/* Avatar */}
                    <div
                        className={cn(
                            'h-24 w-24 rounded-3xl flex items-center justify-center text-3xl font-bold shrink-0 border border-white/50 shadow-sm',
                            colorClass,
                        )}
                    >
                        {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                        <div>
                            <Display as="h1" className="text-3xl sm:text-4xl text-ink leading-tight">
                                {community.name}
                            </Display>
                            {community.created_by_username && (
                                <Muted className="text-sm mt-1">
                                    Created by{' '}
                                    <Link
                                        to="/profiles/$username"
                                        params={{ username: community.created_by_username }}
                                        className="text-accent hover:underline"
                                    >
                                        @{community.created_by_username}
                                    </Link>
                                </Muted>
                            )}
                        </div>

                        <p className="flex items-center gap-1.5 text-ink-soft text-sm">
                            <Users className="h-4 w-4" />
                            {community.member_count.toLocaleString()} member{community.member_count !== 1 ? 's' : ''}
                        </p>

                        {community.description && (
                            <p className="text-ink-soft leading-relaxed max-w-2xl">
                                {community.description}
                            </p>
                        )}

                        {/* Join / Leave */}
                        {me && (
                            isMember ? (
                                <Button
                                    variant="outline"
                                    className="self-start mt-2 border-line text-ink-soft hover:text-red-600 hover:border-red-300 bg-mist hover:bg-red-50"
                                    disabled={isLeaving}
                                    onClick={handleLeave}
                                >
                                    {isLeaving ? 'Leaving…' : 'Leave Community'}
                                </Button>
                            ) : (
                                <Button
                                    className="self-start mt-2 bg-accent hover:bg-accent-light text-white shadow-sm"
                                    disabled={isJoining}
                                    onClick={handleJoin}
                                >
                                    {isJoining ? 'Joining…' : 'Join Community'}
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* ── Members ─────────────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-line" />
                    <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Members
                    </span>
                    <div className="flex-1 border-t border-line" />
                </div>

                {members.length === 0 ? (
                    <p className="text-ink-soft text-center py-12">No members yet. Be the first to join!</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {members.map((profile) => (
                                <ProfileCard
                                    key={profile.id}
                                    profile={profile}
                                    onViewProfile={(username) =>
                                        navigate({ to: '/profiles/$username', params: { username } })
                                    }
                                    onSendMessage={() => {}}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={membersPage === 1}
                                    onClick={() => setMembersPage((p) => p - 1)}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-ink-soft">
                                    Page {membersPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={membersPage >= totalPages}
                                    onClick={() => setMembersPage((p) => p + 1)}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Community Feed ──────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-line" />
                    <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold">
                        Community Feed
                    </span>
                    <div className="flex-1 border-t border-line" />
                </div>

                {isMember ? (
                    <div className="island-shell rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-sm">
                        <p className="text-ink font-semibold">Community posts are coming soon.</p>
                        <Muted className="text-sm max-w-sm">
                            A shared feed for community members is in the works. Stay tuned!
                        </Muted>
                    </div>
                ) : (
                    <div className="island-shell rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-sm opacity-60">
                        <Lock className="h-8 w-8 text-ink-soft" />
                        <p className="text-ink font-semibold">Members only</p>
                        <Muted className="text-sm">Join this community to access the feed.</Muted>
                    </div>
                )}
            </div>

        </div>
    )
}
