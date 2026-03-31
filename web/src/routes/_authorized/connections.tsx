// web/src/routes/_authorized/connections.tsx
import { useState, useMemo, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Display, Body } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import { DiscoverFilterPanel } from '@/components/features/discover/DiscoverFilterPanel'
import {
  getMockMentorConnections,
  getMockMenteeConnections,
  type MockConnection,
} from '@/lib/mocks/connections'

const connectionsSearchSchema = z.strictObject({
  mode: z.enum(['mentee', 'mentor']).catch('mentee'),
})

export const Route = createFileRoute('/_authorized/connections')({
  validateSearch: connectionsSearchSchema,
  component: ConnectionsPage,
})

// FUTURE: Replace PAGE_SIZE / local slicing with paginated API calls:
//   GET /api/mentorship/connections/?role=mentor&page=N&pageSize=PAGE_SIZE
const PAGE_SIZE = 6

// Pre-load mock data outside the component so it is stable across renders.
const ALL_MENTOR_CONNECTIONS = getMockMentorConnections()
const ALL_MENTEE_CONNECTIONS = getMockMenteeConnections()

function ConnectionsPage() {
  const { mode } = Route.useSearch()
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())

  const isMentorMode = mode === 'mentor'
  const allConnections = isMentorMode ? ALL_MENTEE_CONNECTIONS : ALL_MENTOR_CONNECTIONS

  // Unique skill names from all connections in this view, sorted A→Z.
  const allSkills = useMemo(
    () =>
      Array.from(
        new Set(allConnections.flatMap((c) => c.profile.expertise.map((e) => e.name))),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [allConnections],
  )

  const handleSkillToggle = useCallback((skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      next.has(skill) ? next.delete(skill) : next.add(skill)
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }, [])

  const handleSkillClear = useCallback(() => {
    setSelectedSkills(new Set())
    setVisibleCount(PAGE_SIZE)
  }, [])

  // Client-side filtering by selected skills — replaced by API query params once backend is ready.
  const filteredConnections = useMemo(
    () =>
      selectedSkills.size === 0
        ? allConnections
        : allConnections.filter((c) =>
            c.profile.expertise.some((e) => selectedSkills.has(e.name)),
          ),
    [allConnections, selectedSkills],
  )

  const visibleConnections = filteredConnections.slice(0, visibleCount)
  const hasMore = visibleCount < filteredConnections.length
  const totalPages = Math.ceil(filteredConnections.length / PAGE_SIZE)
  const currentPage = Math.ceil(visibleCount / PAGE_SIZE)

  const handleLoadMore = () => {
    // FUTURE: fetch the next page from the API and append to the list.
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const handleViewProfile = (_id: string) => {
    // FUTURE: navigate to /profiles/:id once profile detail routes exist.
    navigate({ to: '/discover' })
  }

  const handleSendMessage = (_id: string) => {
    // FUTURE: open a message compose modal or navigate to the messaging view.
  }

  const handleNewRequest = () => {
    navigate({ to: '/discover' })
  }

  return (
    <div className="page-wrap py-10 sm:py-16 rise-in flex flex-col gap-12">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Display
            as="h1"
            className="text-4xl sm:text-5xl md:text-6xl italic tracking-tight text-ink leading-tight"
          >
            {isMentorMode ? 'My Mentees' : 'My Connections'}
          </Display>
          <Body className="mt-3 text-ink-soft leading-relaxed max-w-xl">
            {isMentorMode
              ? 'Manage your mentees and track their progress in your shared academic journey.'
              : 'Nurture your intellectual growth through your curated network of academic guides and peer collaborators.'}
          </Body>
        </div>

        <div className="flex items-stretch gap-3 shrink-0">
          {/* DiscoverFilterPanel — same component used in the Discover page */}
          <DiscoverFilterPanel
            allSkills={allSkills}
            selectedSkills={selectedSkills}
            onToggle={handleSkillToggle}
            onClear={handleSkillClear}
          />
          <Button
            className="rounded-full bg-accent hover:bg-accent-light text-white gap-2 text-sm font-semibold shadow-sm active:scale-95 px-5"
            aria-label="Go to Discover page to send a new mentorship request"
            onClick={handleNewRequest}
          >
            <PlusIcon />
            New Request
          </Button>
        </div>
      </header>

      {/* ── Mode Toggle ──────────────────────────────────────────────────── */}
      <ModeToggle mode={mode} />

      {/* ── Connections Grid ─────────────────────────────────────────────── */}
      {visibleConnections.length === 0 ? (
        <EmptyState isMentorMode={isMentorMode} hasFilters={selectedSkills.size > 0} />
      ) : (
        <section aria-label={isMentorMode ? 'Your mentees' : 'Your mentors'}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {visibleConnections.map((connection) => (
              <ConnectionCardWithBadge
                key={connection.profile.id}
                connection={connection}
                onViewProfile={handleViewProfile}
                onSendMessage={handleSendMessage}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {filteredConnections.length > 0 && (
        <div className="flex flex-col items-center gap-4 mt-4">
          {hasMore && (
            <Button
              variant="outline"
              className="rounded-full border-line text-ink-soft hover:bg-petal hover:text-ink px-8 py-5 text-sm font-medium active:scale-95"
              onClick={handleLoadMore}
            >
              Load More Connections
            </Button>
          )}
          <p className="text-ink-soft/60 text-xs font-medium uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

/**
 * Wraps the existing ProfileCard with an optional "New Message" badge
 * in the upper-right corner. ProfileCard itself is NOT modified.
 */
function ConnectionCardWithBadge({
  connection,
  onViewProfile,
  onSendMessage,
}: Readonly<{
  connection: MockConnection
  onViewProfile?: (id: string) => void
  onSendMessage?: (id: string) => void
}>) {
  return (
    <div className="relative">
      <ProfileCard
        profile={connection.profile}
        onViewProfile={onViewProfile}
        onSendMessage={onSendMessage}
      />
      {connection.status === 'new-message' && (
        <NewMessageBadge />
      )}
    </div>
  )
}

/** Badge label and accessible colour coding for "new-message" status. */
function NewMessageBadge() {
  return (
    <span
      aria-label="New message available"
      className="
        absolute top-3 right-3
        bg-accent text-white
        text-[10px] font-bold uppercase tracking-widest
        px-2.5 py-1 rounded-full
        shadow-sm pointer-events-none
      "
    >
      New Message
    </span>
  )
}

/** Mode toggle between "My Mentors" and "My Mentees" views. */
function ModeToggle({ mode }: Readonly<{ mode: 'mentee' | 'mentor' }>) {
  const navigate = useNavigate()

  const setMode = (newMode: 'mentee' | 'mentor') => {
    if (mode === newMode) return
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, mode: newMode }) } as any)
  }

  return (
    <div className="flex items-center gap-1 self-start bg-accent-muted rounded-full p-1 border border-chip-line">
      <button
        onClick={() => setMode('mentee')}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
          mode === 'mentee'
            ? 'bg-mist text-ink shadow-sm'
            : 'text-ink-soft hover:text-ink'
        }`}
        aria-pressed={mode === 'mentee'}
      >
        My Mentors
      </button>
      <button
        onClick={() => setMode('mentor')}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
          mode === 'mentor'
            ? 'bg-mist text-ink shadow-sm'
            : 'text-ink-soft hover:text-ink'
        }`}
        aria-pressed={mode === 'mentor'}
      >
        My Mentees
      </button>
    </div>
  )
}

/** Empty state shown when there are no connections (or no filter matches). */
function EmptyState({
  isMentorMode,
  hasFilters,
}: Readonly<{ isMentorMode: boolean; hasFilters: boolean }>) {
  let heading: string
  let body: string

  if (hasFilters) {
    heading = 'No connections match the selected filters.'
    body = 'Try adjusting or clearing your skill filters.'
  } else if (isMentorMode) {
    heading = 'No mentees yet'
    body = 'When students send you mentorship requests, they will appear here.'
  } else {
    heading = 'No mentor connections yet'
    body = 'Explore the Discover page to find mentors and send your first connection request.'
  }

  return (
    <div className="py-24 flex flex-col items-center gap-4 text-center">
      <p className="text-ink text-lg font-semibold">{heading}</p>
      <p className="text-ink-soft text-sm max-w-sm">{body}</p>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}
