import { createFileRoute, Link } from '@tanstack/react-router'
import { Display, Body, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { useMyMatches } from '#/lib/queries/MentorshipQueries.ts'
import { getInitials } from '#/lib/utils.ts'
import { Loader2, UserCircle, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_authorized/connections/')({
    component: ConnectionsPage,
})

export function ConnectionsPage() {
    const { data: me } = useQuery(meQueryOptions)
    const { data: matches = [], isLoading } = useMyMatches()

    const isMentor = me?.app_usage_mode === 'MENTOR'

    const connections = matches
        .filter(m => m.is_active)
        .map(m => ({
            ...(isMentor ? m.mentee : m.mentor),
            matchId: m.id,
        }))

    return (
        <div className="page-wrap py-10 sm:py-16 rise-in flex flex-col gap-12">

            {/* Header */}
            <header className="max-w-2xl">
                <Display
                    as="h1"
                    className="text-4xl sm:text-5xl md:text-6xl italic tracking-tight text-ink leading-tight"
                >
                    {isMentor ? 'My Mentees' : 'My Connections'}
                </Display>
                <Body className="mt-3 text-ink-soft leading-relaxed max-w-xl">
                    {isMentor
                        ? 'Manage your mentees and track their progress in your shared academic journey.'
                        : 'Nurture your intellectual growth through your curated network of academic guides and peer collaborators.'}
                </Body>
            </header>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            ) : connections.length === 0 ? (
                <EmptyState isMentor={isMentor} />
            ) : (
                <section aria-label={isMentor ? 'Your mentees' : 'Your mentors'}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {connections.map(user => (
                            <ConnectionCard
                                key={user.id}
                                id={user.id}
                                matchId={user.matchId}
                                username={user.username}
                                displayName={user.display_name}
                                pictureUrl={user.picture_url}
                                title={'title' in user ? user.title : null}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Connection Card
// ---------------------------------------------------------------------------

interface ConnectionCardProps {
    id: string
    matchId: string
    username: string
    displayName: string
    pictureUrl: string | null
    title: string | null
}

function ConnectionCard({ matchId, username, displayName, pictureUrl, title }: ConnectionCardProps) {
    return (
        <Card className="island-shell border-line shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                {pictureUrl ? (
                    <img
                        src={pictureUrl}
                        alt={displayName}
                        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-line"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-2xl bg-accent text-white text-2xl font-bold flex items-center justify-center ring-1 ring-line">
                        {getInitials(displayName)}
                    </div>
                )}
                <div className="space-y-1">
                    <p className="font-semibold text-ink text-base">{displayName}</p>
                    {title && <Muted className="text-xs">{title}</Muted>}
                    <Muted className="text-xs">@{username}</Muted>
                </div>
                <div className="w-full flex flex-col gap-2">
                    <Link
                        to="/profiles/$username"
                        params={{ username }}
                        className="w-full"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-line text-ink-soft hover:text-ink hover:border-accent/30 transition-colors gap-2"
                        >
                            <UserCircle className="w-4 h-4" />
                            View Profile
                        </Button>
                    </Link>
                    <Link
                        to="/connections/$matchId"
                        params={{ matchId }}
                        className="w-full"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-ink-soft hover:text-accent hover:bg-accent/5 transition-colors gap-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            View Journey
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ isMentor }: { isMentor: boolean }) {
    return (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
            <p className="text-ink text-lg font-semibold">
                {isMentor ? 'No mentees yet' : 'No mentor connections yet'}
            </p>
            <p className="text-ink-soft text-sm max-w-sm">
                {isMentor
                    ? 'When students send you mentorship requests and you accept them, they will appear here.'
                    : 'Explore the Discover page to find mentors and send your first connection request.'}
            </p>
            {!isMentor && (
                <Link to="/discover">
                    <Button className="mt-2 rounded-full bg-accent hover:bg-accent/90 text-white px-6">
                        Explore Mentors
                    </Button>
                </Link>
            )}
        </div>
    )
}
