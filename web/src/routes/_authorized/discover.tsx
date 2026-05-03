import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/lib/queries/useDebounce'
import { Button } from '@/components/ui/button'
import { Display, Muted } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import { DiscoverSearchBar } from '@/components/features/discover/DiscoverSearchBar'
import { DiscoverFilterPanel } from '@/components/features/discover/DiscoverFilterPanel'
import {
    mentorSearchInfiniteQueryOptions,
    allSkillsQueryOptions,
    popularMentorsQueryOptions,
    recentlyAddedMentorsQueryOptions,
} from '@/lib/queries/DiscoverQueries.ts'
import { TrendingUp, Sparkles } from 'lucide-react'
import { useSendMessageToUser } from '@/lib/queries/MessagingQueries.ts'

const PAGE_SIZE = 6
const DISCOVER_SECTION_CONTAINER_CLASS =
    'w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28'

export const Route = createFileRoute('/_authorized/discover')({
    component: DiscoverPage,
})

// ---------------------------------------------------------------------------
// Horizontal scroll row
// ---------------------------------------------------------------------------

interface MentorRowProps {
    title: string
    subtitle: string
    icon: React.ReactNode
    profiles: import('@/lib/queries/DiscoverQueries.ts').PublicMentorProfile[]
    onViewProfile: (username: string) => void
    onSendMessage: (username: string) => void
}

function MentorRow({ title, subtitle, icon, profiles, onViewProfile, onSendMessage }: MentorRowProps) {
    return (
        <div className={`${DISCOVER_SECTION_CONTAINER_CLASS} flex flex-col gap-4`}>
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
                {profiles.map(profile => (
                    <div
                        key={profile.id}
                        className="basis-full md:basis-[calc((100%-4rem)/3)] flex-shrink-0"
                    >
                        <ProfileCard
                            profile={profile}
                            onViewProfile={onViewProfile}
                            onSendMessage={onSendMessage}
                            className="h-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DiscoverPage() {
    const navigate = useNavigate()
    const handleSendMessage = useSendMessageToUser()
    const [query, setQuery] = useState('')
    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())

    const debouncedQuery = useDebounce(query, 300)
    const isSearching = !!debouncedQuery || selectedSkills.size > 0
    const sortedSelectedSkills =
        selectedSkills.size > 0 ? Array.from(selectedSkills).sort((a, b) => a.localeCompare(b)) : undefined

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery(
        mentorSearchInfiniteQueryOptions({
            q: debouncedQuery || undefined,
            skills: sortedSelectedSkills,
            pageSize: PAGE_SIZE,
        }),
    )

    const { data: skillsData } = useQuery(allSkillsQueryOptions)
    const { data: popularMentors = [] } = useQuery(popularMentorsQueryOptions(6))
    const { data: recentMentors = [] } = useQuery(recentlyAddedMentorsQueryOptions(6))

    const allSkillNames = skillsData?.map((s) => s.name) ?? []
    const results = data?.pages.flatMap((p) => p.results) ?? []

    const handleSkillToggle = useCallback((skill: string) => {
        setSelectedSkills((prev) => {
            const next = new Set(prev)
            next.has(skill) ? next.delete(skill) : next.add(skill)
            return next
        })
    }, [])

    const handleSkillClear = useCallback(() => {
        setSelectedSkills(new Set())
    }, [])

    const handleViewProfile = (username: string) => {
        navigate({ to: '/profiles/$username', params: { username } })
    }

    return (
        <div className="py-10 sm:py-16 rise-in flex flex-col gap-12">

            {/* ── Hero Section ─────────────────────────────────────────────────── */}
            <div className="page-wrap">
                <section className="flex flex-col items-center gap-8 text-center">
                    <Display as="h1" className="text-5xl sm:text-6xl md:text-7xl tracking-tight text-ink">
                        Discover the{' '}
                        <span className="italic text-accent">Curated</span>{' '}
                        Network
                    </Display>

                    <div className="flex items-stretch gap-3 w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
                        <DiscoverSearchBar
                            value={query}
                            onChange={(val) => setQuery(val)}
                            className="flex-1 min-w-0"
                        />
                        <DiscoverFilterPanel
                            allSkills={allSkillNames}
                            selectedSkills={selectedSkills}
                            onToggle={handleSkillToggle}
                            onClear={handleSkillClear}
                        />
                    </div>
                </section>
            </div>

            {/* ── Curated Rows (hidden while searching) ────────────────────────── */}
            {!isSearching && (
                <>
                    {popularMentors.length > 0 && (
                        <MentorRow
                            title="Popular Mentors"
                            subtitle="Highest rated mentors trusted by the most mentees in the network."
                            icon={<TrendingUp className="h-5 w-5 text-accent" />}
                            profiles={popularMentors}
                            onViewProfile={handleViewProfile}
                            onSendMessage={handleSendMessage}
                        />
                    )}

                    {recentMentors.length > 0 && (
                        <MentorRow
                            title="Recently Joined"
                            subtitle="Fresh perspectives, mentors who just joined and are ready to take on mentees."
                            icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                            profiles={recentMentors}
                            onViewProfile={handleViewProfile}
                            onSendMessage={handleSendMessage}
                        />
                    )}

                    {/* Divider before full grid */}
                    <div className={DISCOVER_SECTION_CONTAINER_CLASS}>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-line" />
                            <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold">All Mentors</span>
                            <div className="flex-1 border-t border-line" />
                        </div>
                    </div>
                </>
            )}

            {/* ── Profile Grid ─────────────────────────────────────────────────── */}
            <section className={DISCOVER_SECTION_CONTAINER_CLASS}>
                {isFetching && results.length === 0 ? (
                    <div className="py-24 text-center text-ink-soft text-lg">Loading...</div>
                ) : results.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-ink-soft text-lg">
                            {query
                                ? (<>No mentors found matching <span className="font-semibold text-ink">"{query}"</span>.</>)
                                : 'No mentors match the selected filters.'}
                        </p>
                        <p className="text-ink-soft text-sm mt-2">
                            Try adjusting your search or clearing the skill filters.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {results.map((profile) => (
                            <ProfileCard
                                key={profile.id}
                                profile={profile}
                                onViewProfile={handleViewProfile}
                                onSendMessage={handleSendMessage}
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

        </div>
    )
}
