import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { TrendingUp, Sparkles, Plus, X } from 'lucide-react'
import { useDebounce } from '@/lib/queries/useDebounce'
import { Button } from '@/components/ui/button'
import { Display, Muted } from '@/components/Typography'
import { DiscoverSearchBar } from '@/components/features/discover/DiscoverSearchBar'
import { CommunityCard } from '@/components/features/communities/CommunityCard'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    communityListInfiniteQueryOptions,
    popularCommunitiesQueryOptions,
    myCommunitiesQueryOptions,
    useCreateCommunityMutation,
    useJoinCommunityMutation,
    useLeaveCommunityMutation,
} from '@/lib/queries/CommunityQueries.ts'
import { meQueryOptions } from '@/lib/queries/AuthQueries.ts'
import { toast } from 'sonner'
import type { CommunityTag } from '@/lib/queries/CommunityQueries.ts'

const PAGE_SIZE = 6
const SECTION_CLASS = 'w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28'

export const Route = createFileRoute('/_authorized/communities')({
    component: CommunitiesPage,
})

// ---------------------------------------------------------------------------
// Horizontal scroll row
// ---------------------------------------------------------------------------

interface CommunityRowProps {
    title: string
    subtitle: string
    icon: React.ReactNode
    communities: CommunityTag[]
    myIds: Set<string>
    onView: (id: string) => void
    onJoin: (id: string) => void
    onLeave: (id: string) => void
    joiningId: string | null
    leavingId: string | null
}

function CommunityRow({
    title,
    subtitle,
    icon,
    communities,
    myIds,
    onView,
    onJoin,
    onLeave,
    joiningId,
    leavingId,
}: CommunityRowProps) {
    return (
        <div className={`${SECTION_CLASS} flex flex-col gap-4`}>
            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                        {icon}
                        {title}
                    </h2>
                    <Muted className="text-sm">{subtitle}</Muted>
                </div>
            </div>
            <div className="flex gap-8 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden">
                {communities.map((community) => (
                    <div
                        key={community.id}
                        className="basis-full md:basis-[calc((100%-4rem)/3)] flex-shrink-0"
                    >
                        <CommunityCard
                            community={community}
                            isMember={myIds.has(community.id)}
                            onViewCommunity={onView}
                            onJoin={onJoin}
                            onLeave={onLeave}
                            isJoining={joiningId === community.id}
                            isLeaving={leavingId === community.id}
                            className="h-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Create Community Modal
// ---------------------------------------------------------------------------

interface CreateCommunityModalProps {
    open: boolean
    onClose: () => void
}

function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const { mutateAsync, isPending } = useCreateCommunityMutation()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        try {
            await mutateAsync({ name: name.trim(), description: description.trim() })
            toast.success(`Community "${name.trim()}" created!`)
            setName('')
            setDescription('')
            onClose()
        } catch {
            toast.error('Failed to create community. The name may already be taken.')
        }
    }

    const handleClose = () => {
        setName('')
        setDescription('')
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">Create a Community</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="community-name">Name <span className="text-accent">*</span></Label>
                        <Input
                            id="community-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Frontend Istanbul"
                            maxLength={120}
                            required
                        />
                        <p className="text-xs text-ink-soft">{name.length}/120 · Name cannot be changed later.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="community-desc">Description</Label>
                        <Textarea
                            id="community-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this community about?"
                            rows={3}
                        />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-accent hover:bg-accent-light text-white"
                            disabled={!name.trim() || isPending}
                        >
                            {isPending ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function CommunitiesPage() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [leavingId, setLeavingId] = useState<string | null>(null)

    const debouncedQuery = useDebounce(query, 300)
    const isSearching = !!debouncedQuery

    const { data: me } = useQuery(meQueryOptions)
    const { data, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery(
        communityListInfiniteQueryOptions(debouncedQuery || undefined, PAGE_SIZE),
    )
    const { data: popularCommunities = [] } = useQuery(popularCommunitiesQueryOptions(6))
    const { data: myCommunities = [] } = useQuery({
        ...myCommunitiesQueryOptions(),
        enabled: Boolean(me),
    })

    const joinMutation = useJoinCommunityMutation()
    const leaveMutation = useLeaveCommunityMutation()

    const myIds = new Set(myCommunities.map((c) => c.id))
    const results = data?.pages.flatMap((p) => p.results) ?? []

    const handleView = useCallback((id: string) => {
        navigate({ to: '/communities/$communityId', params: { communityId: id } })
    }, [navigate])

    const handleJoin = useCallback(async (id: string) => {
        setJoiningId(id)
        try {
            await joinMutation.mutateAsync(id)
            toast.success('Joined community!')
        } catch {
            toast.error('Failed to join community.')
        } finally {
            setJoiningId(null)
        }
    }, [joinMutation])

    const handleLeave = useCallback(async (id: string) => {
        setLeavingId(id)
        try {
            await leaveMutation.mutateAsync(id)
            toast.success('Left community.')
        } catch {
            toast.error('Failed to leave community.')
        } finally {
            setLeavingId(null)
        }
    }, [leaveMutation])

    return (
        <div className="py-10 sm:py-16 rise-in flex flex-col gap-12">

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div className="page-wrap">
                <section className="flex flex-col items-center gap-8 text-center">
                    <Display as="h1" className="text-5xl sm:text-6xl md:text-7xl tracking-tight text-ink">
                        Explore{' '}
                        <span className="italic text-accent">Communities</span>
                    </Display>

                    <div className="flex items-stretch gap-3 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                        <DiscoverSearchBar
                            value={query}
                            onChange={setQuery}
                            className="flex-1 min-w-0"
                        />
                        {query && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setQuery('')}
                                className="shrink-0"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            className="shrink-0 bg-accent hover:bg-accent-light text-white shadow-sm flex items-center gap-1.5"
                            size="sm"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Create</span>
                        </Button>
                    </div>
                </section>
            </div>

            {/* ── Curated rows (hidden while searching) ───────────────────── */}
            {!isSearching && (
                <>
                    {myCommunities.length > 0 && (
                        <CommunityRow
                            title="My Communities"
                            subtitle="Communities you've joined."
                            icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                            communities={myCommunities}
                            myIds={myIds}
                            onView={handleView}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                            joiningId={joiningId}
                            leavingId={leavingId}
                        />
                    )}

                    {popularCommunities.length > 0 && (
                        <CommunityRow
                            title="Popular Communities"
                            subtitle="The most active communities in the network."
                            icon={<TrendingUp className="h-5 w-5 text-accent" />}
                            communities={popularCommunities}
                            myIds={myIds}
                            onView={handleView}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                            joiningId={joiningId}
                            leavingId={leavingId}
                        />
                    )}

                    <div className={SECTION_CLASS}>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-line" />
                            <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold">All Communities</span>
                            <div className="flex-1 border-t border-line" />
                        </div>
                    </div>
                </>
            )}

            {/* ── Community grid ──────────────────────────────────────────── */}
            <section className={SECTION_CLASS}>
                {isFetching && results.length === 0 ? (
                    <div className="py-24 text-center text-ink-soft text-lg">Loading...</div>
                ) : results.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-ink-soft text-lg">
                            {debouncedQuery
                                ? (<>No communities found matching <span className="font-semibold text-ink">"{debouncedQuery}"</span>.</>)
                                : 'No communities yet.'}
                        </p>
                        {!debouncedQuery && (
                            <p className="text-ink-soft text-sm mt-2">
                                Be the first to{' '}
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-accent underline-offset-2 hover:underline"
                                >
                                    create one
                                </button>
                                !
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {results.map((community) => (
                            <CommunityCard
                                key={community.id}
                                community={community}
                                isMember={myIds.has(community.id)}
                                onViewCommunity={handleView}
                                onJoin={handleJoin}
                                onLeave={handleLeave}
                                isJoining={joiningId === community.id}
                                isLeaving={leavingId === community.id}
                                className="h-full"
                            />
                        ))}
                    </div>
                )}

                {hasNextPage && (
                    <div className="mt-16 flex justify-center">
                        <Button
                            onClick={() => fetchNextPage()}
                            disabled={isFetching}
                            className="bg-accent hover:bg-accent-light text-white px-12 py-6 rounded-full text-sm font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 transition-all duration-300"
                        >
                            {isFetching ? 'Loading...' : 'Load More'}
                        </Button>
                    </div>
                )}
            </section>

            <CreateCommunityModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
        </div>
    )
}
