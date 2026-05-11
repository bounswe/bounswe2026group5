import { createFileRoute, Link } from '@tanstack/react-router'
import { Display, Body, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { useMyMatches, useDeactivateMatch } from '#/lib/queries/MentorshipQueries.ts'
import { getAbsoluteMediaUrl, getInitials } from '#/lib/utils.ts'
import { Loader2, UserCircle, BookOpen, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authorized/connections/')({
    component: ConnectionsPage,
})

export function ConnectionsPage() {
    const { data: me } = useQuery(meQueryOptions)
    const { data: matches = [], isLoading } = useMyMatches()

    const isMentor = me?.app_usage_mode === 'MENTOR'
    const queryClient = useQueryClient()
    const deactivateMutation = useDeactivateMatch()
    const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null)

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
                <div className="flex justify-center py-16" role="status" aria-label="Loading connections">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-hidden="true" />
                </div>
            ) : connections.length === 0 ? (
                <EmptyState isMentor={isMentor} />
            ) : (
                <section aria-label={isMentor ? 'Your mentees' : 'Your mentors'}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {connections.map(user => (
                            <ConnectionCard
                                key={user.id}
                                matchId={user.matchId}
                                username={user.username}
                                displayName={user.display_name}
                                pictureUrl={user.picture_url}
                                title={'title' in user ? user.title : null}
                                onDeactivate={() => setDeactivateTarget(user.matchId)}
                            />
                        ))}
                    </div>
                </section>
            )}

            <Dialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>End Match?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-ink-soft mt-1">
                        Are you sure you want to end this match? This will end the active mentorship connection.
                    </p>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>
                            Keep Connection
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deactivateMutation.isPending}
                            onClick={() => {
                                if (deactivateTarget) {
                                    deactivateMutation.mutate(deactivateTarget, {
                                        onSuccess: () => {
                                            toast.success('Mentorship match ended successfully.')
                                            setDeactivateTarget(null)
                                            queryClient.invalidateQueries({ queryKey: ['mentorship', 'matches'] })
                                        },
                                        onError: () => {
                                            toast.error('Failed to end match. Please try again.')
                                        }
                                    })
                                }
                            }}
                        >
                            {deactivateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Remove'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Connection Card
// ---------------------------------------------------------------------------

interface ConnectionCardProps {
    matchId: string
    username: string
    displayName: string
    pictureUrl: string | null
    title: string | null
    onDeactivate: () => void
}

function ConnectionCard({ matchId, username, displayName, pictureUrl, title, onDeactivate }: ConnectionCardProps) {
    return (
        <Card className="island-shell border-line shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                {pictureUrl ? (
                    <img
                        src={getAbsoluteMediaUrl(pictureUrl)}
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
                            <UserCircle className="w-4 h-4" aria-hidden="true" />
                            View Profile
                        </Button>
                    </Link>
                    <Link
                        to="/connections/$matchId"
                        params={{ matchId }}
                        className="w-full"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-line text-ink-soft hover:text-ink hover:border-accent/30 transition-colors gap-2"
                        >
                            <BookOpen className="w-4 h-4" aria-hidden="true" />
                            View Journey
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDeactivate}
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors gap-2 mt-1"
                    >
                        <AlertCircle className="w-4 h-4" />
                        End Match
                    </Button>
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
