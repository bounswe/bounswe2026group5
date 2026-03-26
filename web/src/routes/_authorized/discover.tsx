// web/src/routes/_authorized/discover.tsx
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Display } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import { DiscoverSearchBar } from '@/components/features/discover/DiscoverSearchBar'
import { MOCK_DISCOVER_PROFILES } from '@/lib/mocks/discover'

// TODO: Replace PAGE_SIZE and pagination logic with a real API call that
//       supports GET /api/users/discover/?page=N&pageSize=PAGE_SIZE&q=<query>
const PAGE_SIZE = 6

export const Route = createFileRoute('/_authorized/discover')({
  component: DiscoverPage,
})

function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // TODO: Replace this client-side filter with a debounced API search call
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MOCK_DISCOVER_PROFILES
    return MOCK_DISCOVER_PROFILES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q)) ||
        p.bio.toLowerCase().includes(q),
    )
  }, [query])

  const visibleProfiles = filteredProfiles.slice(0, visibleCount)
  const hasMore = visibleCount < filteredProfiles.length

  const handleLoadMore = () => {
    // TODO: When paginating via API, fetch the next page and append results
    //       instead of slicing a local array.
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const handleViewProfile = (_id: string) => {
    // TODO: Navigate to the profile page once individual profile routes exist
    //       e.g. navigate({ to: '/profiles/$userId', params: { userId: id } })
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

          <DiscoverSearchBar
            value={query}
            onChange={(val) => {
              setQuery(val)
              // Reset pagination when search query changes
              setVisibleCount(PAGE_SIZE)
            }}
            className="w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
          />
        </section>
      </div>

      {/* ── Profile Grid — wider than page-wrap, responsive padding ───────── */}
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20 xl:px-28">
        {visibleProfiles.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-ink-soft text-lg">
              No profiles found matching{' '}
              <span className="font-semibold text-ink">"{query}"</span>.
            </p>
            <p className="text-ink-soft text-sm mt-2">
              Try a different name, skill, or title.
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