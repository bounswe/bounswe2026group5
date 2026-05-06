import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
    useMatchJourney,
    useCreateMCTE,
    useEditMCTE,
    useDeleteMCTE,
    type JourneyEvent,
    type MCTECreatePayload,
    type MCTEUpdatePayload,
} from '#/lib/queries/TimelineQueries.ts'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { Display, Body, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
    Loader2,
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Trophy,
    Users,
    TrendingUp,
    Handshake,
    CalendarCheck,
    CalendarX,
    CalendarClock,
    CalendarCheck2,
    Flag,
    AlertCircle,
} from 'lucide-react'

export const Route = createFileRoute('/_authorized/connections/$matchId')({
    component: JourneyPage,
})

// ---------------------------------------------------------------------------
// AGTE event metadata
// ---------------------------------------------------------------------------

const AGTE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
    request_accepted: { label: 'Mentorship began', Icon: Handshake, color: 'text-green-600' },
    session_scheduled: { label: 'Session scheduled', Icon: CalendarCheck, color: 'text-blue-600' },
    session_rescheduled: { label: 'Session rescheduled', Icon: CalendarClock, color: 'text-amber-600' },
    session_canceled: { label: 'Session canceled', Icon: CalendarX, color: 'text-red-500' },
    session_completed: { label: 'Session completed', Icon: CalendarCheck2, color: 'text-green-600' },
    mentorship_ended: { label: 'Mentorship ended', Icon: Flag, color: 'text-ink-soft' },
}

const MCTE_META: Record<string, { label: string; Icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' }> = {
    achievement: { label: 'Achievement', Icon: Trophy, variant: 'default' },
    social: { label: 'Social', Icon: Users, variant: 'secondary' },
    progress: { label: 'Progress', Icon: TrendingUp, variant: 'outline' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatSessionTime(isoString: unknown) {
    if (typeof isoString !== 'string') return ''
    return new Date(isoString).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------------------------------------------------------------------------
// Journey Page
// ---------------------------------------------------------------------------

function JourneyPage() {
    const { matchId } = Route.useParams()
    const { data: me } = useQuery(meQueryOptions)
    const { data: feed, isLoading, isError } = useMatchJourney(matchId)

    const [createOpen, setCreateOpen] = useState(false)
    const [editEvent, setEditEvent] = useState<JourneyEvent | null>(null)
    const [deleteEvent, setDeleteEvent] = useState<JourneyEvent | null>(null)

    return (
        <div className="page-wrap py-10 sm:py-16 rise-in flex flex-col gap-10">

            {/* Header */}
            <header className="flex flex-col gap-4 max-w-2xl">
                <Link to="/connections" className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Connections
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <Display
                            as="h1"
                            className="text-4xl sm:text-5xl italic tracking-tight text-ink leading-tight"
                        >
                            Our Journey
                        </Display>
                        <Body className="mt-2 text-ink-soft">
                            A shared timeline of milestones, sessions, and moments in your mentorship.
                        </Body>
                    </div>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="rounded-full bg-accent hover:bg-accent/90 text-white gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add Entry
                    </Button>
                </div>
            </header>

            {/* Timeline */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            ) : isError ? (
                <ErrorState />
            ) : !feed || feed.results.length === 0 ? (
                <EmptyState />
            ) : (
                <section aria-label="Journey timeline">
                    <div className="relative flex flex-col gap-0">
                        {feed.results.map((event, index) => (
                            <TimelineEventItem
                                key={event.id}
                                event={event}
                                isLast={index === feed.results.length - 1}
                                currentUsername={me?.username}
                                onEdit={setEditEvent}
                                onDelete={setDeleteEvent}
                            />
                        ))}
                    </div>
                    {feed.count > feed.results.length && (
                        <p className="mt-6 text-center text-ink-soft text-sm">
                            Showing {feed.results.length} of {feed.count} events
                        </p>
                    )}
                </section>
            )}

            {/* Dialogs */}
            <CreateMCTEDialog
                matchId={matchId}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            {editEvent && (
                <EditMCTEDialog
                    matchId={matchId}
                    event={editEvent}
                    open={!!editEvent}
                    onOpenChange={open => { if (!open) setEditEvent(null) }}
                />
            )}
            {deleteEvent && (
                <DeleteConfirmDialog
                    matchId={matchId}
                    event={deleteEvent}
                    open={!!deleteEvent}
                    onOpenChange={open => { if (!open) setDeleteEvent(null) }}
                />
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Timeline event item
// ---------------------------------------------------------------------------

interface TimelineEventItemProps {
    event: JourneyEvent
    isLast: boolean
    currentUsername: string | undefined
    onEdit: (e: JourneyEvent) => void
    onDelete: (e: JourneyEvent) => void
}

function TimelineEventItem({ event, isLast, currentUsername, onEdit, onDelete }: TimelineEventItemProps) {
    if (event.category === 'AGTE') {
        return <AGTEItem event={event} isLast={isLast} />
    }
    const isOwner = !!currentUsername && event.author?.username === currentUsername
    return <MCTEItem event={event} isLast={isLast} isOwner={isOwner} onEdit={onEdit} onDelete={onDelete} />
}

function AGTEItem({ event, isLast }: { event: JourneyEvent; isLast: boolean }) {
    const meta = AGTE_META[event.type] ?? { label: event.type, Icon: AlertCircle, color: 'text-ink-soft' }
    const { Icon, label, color } = meta

    const payload = event.payload ?? {}
    const startAt = (payload['scheduled_start_at_utc'] ?? payload['initial_session_start_at']) as string | null | undefined
    const endAt = (payload['scheduled_end_at_utc'] ?? payload['initial_session_end_at']) as string | null | undefined
    const cancelReason = payload['cancel_reason'] as string | undefined

    return (
        <div className="relative flex gap-4 pb-8">
            {/* Vertical line */}
            {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-px bg-line" />
            )}
            {/* Dot */}
            <div className={`mt-1 w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center shrink-0 z-10 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            {/* Content */}
            <div className="flex flex-col gap-1 pt-1.5 min-w-0">
                <p className={`font-semibold text-sm ${color}`}>{label}</p>
                {startAt && (
                    <p className="text-xs text-ink-soft">
                        {formatSessionTime(startAt)}
                        {endAt ? ` – ${formatSessionTime(endAt)}` : ''}
                    </p>
                )}
                {cancelReason && (
                    <p className="text-xs text-ink-soft italic">"{cancelReason}"</p>
                )}
                <Muted className="text-xs">{formatTimestamp(event.timestamp)}</Muted>
            </div>
        </div>
    )
}

function MCTEItem({
    event,
    isLast,
    isOwner,
    onEdit,
    onDelete,
}: {
    event: JourneyEvent
    isLast: boolean
    isOwner: boolean
    onEdit: (e: JourneyEvent) => void
    onDelete: (e: JourneyEvent) => void
}) {
    const meta = MCTE_META[event.type] ?? { label: event.type, Icon: AlertCircle, variant: 'outline' as const }
    const { Icon, label, variant } = meta

    return (
        <div className="relative flex gap-4 pb-8">
            {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-px bg-line" />
            )}
            <div className="mt-1 w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 z-10 text-accent">
                <Icon className="w-5 h-5" />
            </div>
            <Card className="flex-1 border-line shadow-sm bg-white">
                <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Badge variant={variant} className="text-xs">{label}</Badge>
                            {event.author && (
                                <Muted className="text-xs">by @{event.author.username}</Muted>
                            )}
                        </div>
                        {isOwner && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-ink-soft hover:text-ink"
                                    onClick={() => onEdit(event)}
                                    aria-label="Edit entry"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-ink-soft hover:text-red-500"
                                    onClick={() => onDelete(event)}
                                    aria-label="Delete entry"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                    {event.content && (
                        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{event.content}</p>
                    )}
                    {event.media_url && (
                        <a
                            href={event.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent underline truncate"
                        >
                            {event.media_url}
                        </a>
                    )}
                    <Muted className="text-xs">{formatTimestamp(event.timestamp)}</Muted>
                </CardContent>
            </Card>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Create MCTE Dialog
// ---------------------------------------------------------------------------

interface CreateMCTEDialogProps {
    matchId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

function CreateMCTEDialog({ matchId, open, onOpenChange }: CreateMCTEDialogProps) {
    const createMutation = useCreateMCTE(matchId)
    const [form, setForm] = useState<MCTECreatePayload>({
        event_type: 'achievement',
        content: '',
        media_url: '',
        show_on_profile: false,
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.content.trim()) return
        const payload: MCTECreatePayload = {
            event_type: form.event_type,
            content: form.content.trim(),
            ...(form.media_url?.trim() ? { media_url: form.media_url.trim() } : {}),
            show_on_profile: form.show_on_profile,
        }
        createMutation.mutate(payload, {
            onSuccess: () => {
                toast.success('Entry added to your journey')
                setForm({ event_type: 'achievement', content: '', media_url: '', show_on_profile: false })
                onOpenChange(false)
            },
            onError: () => {
                toast.error('Failed to add entry. Please try again.')
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Journey Entry</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="event_type">Type</Label>
                        <Select
                            value={form.event_type}
                            onValueChange={v => setForm(f => ({ ...f, event_type: v as MCTECreatePayload['event_type'] }))}
                        >
                            <SelectTrigger id="event_type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="achievement">Achievement</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="progress">Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="content"
                            value={form.content}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            placeholder="Describe this milestone or moment..."
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{form.content.length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="media_url">Media URL (optional)</Label>
                        <Input
                            id="media_url"
                            value={form.media_url ?? ''}
                            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="show_on_profile"
                            checked={form.show_on_profile}
                            onCheckedChange={v => setForm(f => ({ ...f, show_on_profile: !!v }))}
                        />
                        <Label htmlFor="show_on_profile" className="cursor-pointer font-normal">
                            Also share this on my profile
                        </Label>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!form.content.trim() || createMutation.isPending}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Add Entry'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Edit MCTE Dialog
// ---------------------------------------------------------------------------

interface EditMCTEDialogProps {
    matchId: string
    event: JourneyEvent
    open: boolean
    onOpenChange: (open: boolean) => void
}

function EditMCTEDialog({ matchId, event, open, onOpenChange }: EditMCTEDialogProps) {
    const editMutation = useEditMCTE(matchId)
    const [form, setForm] = useState<MCTEUpdatePayload>({
        content: event.content,
        media_url: event.media_url ?? '',
        show_on_profile: event.show_on_profile,
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload: MCTEUpdatePayload = {
            content: form.content?.trim(),
            media_url: form.media_url?.trim() || null,
            show_on_profile: form.show_on_profile,
        }
        editMutation.mutate(
            { eventId: event.id, payload },
            {
                onSuccess: () => {
                    toast.success('Entry updated')
                    onOpenChange(false)
                },
                onError: () => {
                    toast.error('Failed to update entry. Please try again.')
                },
            },
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Journey Entry</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit_content">Content <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="edit_content"
                            value={form.content ?? ''}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            placeholder="Describe this milestone or moment..."
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{(form.content ?? '').length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit_media_url">Media URL (optional)</Label>
                        <Input
                            id="edit_media_url"
                            value={form.media_url ?? ''}
                            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="edit_show_on_profile"
                            checked={form.show_on_profile ?? false}
                            onCheckedChange={v => setForm(f => ({ ...f, show_on_profile: !!v }))}
                        />
                        <Label htmlFor="edit_show_on_profile" className="cursor-pointer font-normal">
                            Also share this on my profile
                        </Label>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!form.content?.trim() || editMutation.isPending}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
                            {editMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
    matchId: string
    event: JourneyEvent
    open: boolean
    onOpenChange: (open: boolean) => void
}

function DeleteConfirmDialog({ matchId, event, open, onOpenChange }: DeleteConfirmDialogProps) {
    const deleteMutation = useDeleteMCTE(matchId)

    function handleConfirm() {
        deleteMutation.mutate(event.id, {
            onSuccess: () => {
                toast.success('Entry removed from your journey')
                onOpenChange(false)
            },
            onError: () => {
                toast.error('Failed to delete entry. Please try again.')
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Remove Entry</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-ink-soft mt-1">
                    Are you sure you want to remove this journey entry? This action cannot be undone.
                </p>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={handleConfirm}
                    >
                        {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Remove'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Empty / Error states
// ---------------------------------------------------------------------------

function EmptyState() {
    return (
        <div className="py-24 flex flex-col items-center gap-3 text-center">
            <p className="text-ink text-lg font-semibold">No journey events yet</p>
            <p className="text-ink-soft text-sm max-w-sm">
                Your shared history will appear here as you schedule sessions and reach milestones together.
                You can also add manual entries to capture achievements and progress.
            </p>
        </div>
    )
}

function ErrorState() {
    return (
        <div className="py-24 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-ink text-lg font-semibold">Could not load journey</p>
            <p className="text-ink-soft text-sm max-w-sm">
                You may not have access to this journey, or something went wrong. Please try again.
            </p>
        </div>
    )
}
