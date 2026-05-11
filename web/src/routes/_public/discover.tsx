import { useState, useCallback, useRef } from 'react'
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
import { useMessaging } from '@/lib/queries/MessagingQueries.ts'

const PAGE_SIZE = 6
const DISCOVER_SECTION_CONTAINER_CLASS =
    'w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28'

export const Route = createFileRoute('/_public/discover')({
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
    matchedUsernames: Set<string>
}

function MentorRow({ title, subtitle, icon, profiles, onViewProfile, onSendMessage, matchedUsernames }: MentorRowProps) {
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
                            onSendMessage={matchedUsernames.has(profile.username) ? onSendMessage : undefined}
                            className="h-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Geolocation toast
// ---------------------------------------------------------------------------

function LocationDeniedToast({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
    if (!visible) return null
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span>Location access denied. Distance filter has been cleared.</span>
            <button type="button" onClick={onDismiss} className="text-white/60 hover:text-white ml-1 font-bold">✕</button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DiscoverPage() {
    const navigate = useNavigate()
    const { matchedUsernames, sendMessageTo } = useMessaging()
    const [query, setQuery] = useState('')
    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
    const [selectedDistanceKm, setSelectedDistanceKm] = useState<number | null>(null)
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [locationDeniedToast, setLocationDeniedToast] = useState(false)
    const geolocationRequested = useRef(false)

    const debouncedQuery = useDebounce(query, 300)
    const isSearching = !!debouncedQuery || selectedSkills.size > 0 || selectedDistanceKm !== null
    const sortedSelectedSkills =
        selectedSkills.size > 0 ? Array.from(selectedSkills).sort((a, b) => a.localeCompare(b)) : undefined

    // Build search params — include geolocation only when we have both coords and a distance
    const searchParams = {
        q: debouncedQuery || undefined,
        skills: sortedSelectedSkills,
        pageSize: PAGE_SIZE,
        ...(selectedDistanceKm != null && userCoords != null
            ? { lat: userCoords.lat, lng: userCoords.lng, distanceKm: selectedDistanceKm }
            : {}),
    }

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery(
        mentorSearchInfiniteQueryOptions(searchParams),
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

    const handleDistanceChange = useCallback((distanceKm: number | null) => {
        if (distanceKm === null) {
            // Clearing distance filter
            setSelectedDistanceKm(null)
            return
        }

        // If we already have coords cached, just set the distance
        if (userCoords) {
            setSelectedDistanceKm(distanceKm)
            return
        }

        // Request browser geolocation
        if (!navigator.geolocation) {
            setLocationDeniedToast(true)
            return
        }

        // Prevent multiple simultaneous requests
        if (geolocationRequested.current) return
        geolocationRequested.current = true

        navigator.geolocation.getCurrentPosition(
            (position) => {
                geolocationRequested.current = false
                setUserCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
                setSelectedDistanceKm(distanceKm)
            },
            () => {
                // Denied or error
                geolocationRequested.current = false
                setSelectedDistanceKm(null)
                setLocationDeniedToast(true)
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        )
    }, [userCoords])

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
                            selectedDistanceKm={selectedDistanceKm}
                            onToggle={handleSkillToggle}
                            onClear={handleSkillClear}
                            onDistanceChange={handleDistanceChange}
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
                            icon={<TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />}
                            profiles={popularMentors}
                            onViewProfile={handleViewProfile}
                            onSendMessage={sendMessageTo}
                            matchedUsernames={matchedUsernames}
                        />
                    )}

                    {recentMentors.length > 0 && (
                        <MentorRow
                            title="Recently Joined"
                            subtitle="Fresh perspectives, mentors who just joined and are ready to take on mentees."
                            icon={<Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />}
                            profiles={recentMentors}
                            onViewProfile={handleViewProfile}
                            onSendMessage={sendMessageTo}
                            matchedUsernames={matchedUsernames}
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
                                : selectedDistanceKm !== null
                                    ? 'No mentors found within the selected distance.'
                                    : 'No mentors match the selected filters.'}
                        </p>
                        <p className="text-ink-soft text-sm mt-2">
                            Try adjusting your search or clearing the filters.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {results.map((profile) => (
                            <ProfileCard
                                key={profile.id}
                                profile={profile}
                                onViewProfile={handleViewProfile}
                                onSendMessage={matchedUsernames.has(profile.username) ? sendMessageTo : undefined}
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
                            className="bg-accent hover:bg-accent-light text-white px-10 shadow-sm hover:-translate-y-0.5 transition-all duration-200"
                        >
                            {isFetching ? 'Loading...' : 'Load More'}
                        </Button>
                    </div>
                )}
            </section>

            {/* ── Location Denied Toast ─────────────────────────────────────────── */}
            <LocationDeniedToast
                visible={locationDeniedToast}
                onDismiss={() => setLocationDeniedToast(false)}
            />
        </div>
    )
}
