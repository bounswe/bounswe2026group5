// web/src/routes/_authorized/discover.tsx
import { useState, useMemo, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Display } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import { DiscoverSearchBar } from '@/components/features/discover/DiscoverSearchBar'
import { DiscoverFilterPanel } from '@/components/features/discover/DiscoverFilterPanel'
import { getAllMockProfiles } from '@/lib/mocks/profiles'

// TODO: Replace PAGE_SIZE and pagination logic with a real API call that
//       supports GET /api/users/discover/?page=N&pageSize=PAGE_SIZE&q=<query>
const PAGE_SIZE = 6

export const Route = createFileRoute('/_authorized/discover')({
  component: DiscoverPage,
})

const ALL_PROFILES = getAllMockProfiles().filter(
  (p) => p.mentorshipMode === 'MENTOR' || p.mentorshipMode === 'BOTH',
)

// Unique skill names across all mentor profiles, sorted A→Z (case-insensitive)
const ALL_SKILLS = Array.from(
  new Set(ALL_PROFILES.flatMap((p) => p.expertise.map((e) => e.name))),
).sort((a, b) => a.localeCompare(b))

function DiscoverPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const handleSkillToggle = useCallback((skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) {
        next.delete(skill)
      } else {
        next.add(skill)
      }
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }, [])

  const handleSkillClear = useCallback(() => {
    setSelectedSkills(new Set())
    setVisibleCount(PAGE_SIZE)
  }, [])

  // TODO: Replace this client-side filter with a debounced API search call
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_PROFILES.filter((p) => {
      const matchesQuery =
        !q ||
        p.displayName.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.expertise.some((e) => e.name.toLowerCase().includes(q)) ||
        p.bio.toLowerCase().includes(q)

      const matchesSkills =
        selectedSkills.size === 0 ||
        p.expertise.some((e) => selectedSkills.has(e.name))

      return matchesQuery && matchesSkills
    })
  }, [query, selectedSkills])

  const visibleProfiles = filteredProfiles.slice(0, visibleCount)
  const hasMore = visibleCount < filteredProfiles.length

  const handleLoadMore = () => {
    // TODO: When paginating via API, fetch the next page and append results
    //       instead of slicing a local array.
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const handleViewProfile = (id: string) => {
    navigate({ to: '/profiles/$profileId', params: { profileId: id } })
  }

  const handleSendMessage = (_id: string) => {
    // TODO: Open a message compose modal or navigate to the messaging view
  }

  return (
    <div className="py-10 sm:py-16 rise-in flex flex-col gap-12">

      {/* ── Hero Section — constrained to page-wrap width ─────────────────── */}
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
              onChange={(val) => {
                setQuery(val)
                setVisibleCount(PAGE_SIZE)
              }}
              className="flex-1 min-w-0"
            />
            <DiscoverFilterPanel
              allSkills={ALL_SKILLS}
              selectedSkills={selectedSkills}
              onToggle={handleSkillToggle}
              onClear={handleSkillClear}
            />
          </div>
        </section>
      </div>

      {/* ── Profile Grid — wider than page-wrap, responsive padding ───────── */}
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28">
        {visibleProfiles.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-ink-soft text-lg">
              {query
                ? <>No mentors found matching <span className="font-semibold text-ink">"{query}"</span>.</>
                : 'No mentors match the selected filters.'}
            </p>
            <p className="text-ink-soft text-sm mt-2">
              Try adjusting your search or clearing the skill filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {visibleProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onViewProfile={handleViewProfile}
                onSendMessage={handleSendMessage}
              />
            ))}
          </div>
        )}

        {/* ── Load More ──────────────────────────────────────────────────── */}
        {hasMore && (
          <div className="mt-16 flex justify-center">
            <Button
              onClick={handleLoadMore}
              className="bg-accent hover:bg-accent-light text-white px-12 py-6 rounded-full text-sm font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              Load More
            </Button>
          </div>
        )}
      </section>

    </div>
  )
}