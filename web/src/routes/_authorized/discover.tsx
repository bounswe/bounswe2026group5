import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/lib/queries/useDebounce'
import { Button } from '@/components/ui/button'
import { Display } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import { DiscoverSearchBar } from '@/components/features/discover/DiscoverSearchBar'
import { DiscoverFilterPanel } from '@/components/features/discover/DiscoverFilterPanel'
import { mentorSearchInfiniteQueryOptions, allSkillsQueryOptions } from '@/lib/queries/DiscoverQueries.ts'

const PAGE_SIZE = 3

export const Route = createFileRoute('/_authorized/discover')({
    component: DiscoverPage,
})

export function DiscoverPage() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())

    const debouncedQuery = useDebounce(query, 300)

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery(
        mentorSearchInfiniteQueryOptions({
            q: debouncedQuery || undefined,
            skills: selectedSkills.size > 0 ? Array.from(selectedSkills) : undefined,
            pageSize: PAGE_SIZE,
        }),
    )

    const { data: skillsData } = useQuery(allSkillsQueryOptions)
    const allSkillNames = skillsData?.map((s) => s.name) ?? []

    // Flatten all pages into one list
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

            {/* ── Profile Grid ─────────────────────────────────────────────────── */}
            <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28">
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
                                onSendMessage={() => {}}
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