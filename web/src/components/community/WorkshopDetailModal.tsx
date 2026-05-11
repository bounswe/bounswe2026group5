import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Calendar, Clock, Users, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Muted } from '@/components/Typography'
import { toast } from 'sonner'
import { cn, getAbsoluteMediaUrl } from '@/lib/utils'
import {
    useCommunityWorkshopDetail,
    useJoinWorkshopMutation,
    useLeaveWorkshopMutation,
    useDeleteWorkshopMutation,
    type CommunityWorkshop,
} from '@/lib/queries/WorkshopQueries.ts'
import { CreateWorkshopDialog } from './CreateWorkshopDialog'

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
]

function avatarColor(name: string) {
    return AVATAR_COLORS[name.length % AVATAR_COLORS.length]
}

function miniInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function WorkshopStatusBadge({ status, isFull }: { status: string; isFull: boolean }) {
    if (status === 'CANCELLED') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Cancelled</span>
    if (status === 'COMPLETED') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Ended</span>
    if (isFull) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Full</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">Open</span>
}

interface WorkshopDetailModalProps {
    workshop: CommunityWorkshop | null
    tagId: string
    open: boolean
    onClose: () => void
    currentUsername?: string
}

export function WorkshopDetailModal({ workshop, tagId, open, onClose, currentUsername }: WorkshopDetailModalProps) {
    const [editOpen, setEditOpen] = useState(false)
    const [confirmCancel, setConfirmCancel] = useState(false)

    const { data: detail, isLoading: detailLoading } = useCommunityWorkshopDetail(
        tagId,
        workshop?.id ?? '',
    )

    const joinMutation = useJoinWorkshopMutation(tagId)
    const leaveMutation = useLeaveWorkshopMutation(tagId)
    const deleteMutation = useDeleteWorkshopMutation(tagId)

    if (!workshop) return null

    // Prefer detail (server truth) over prop once loaded; prop is used as initial/fallback
    const resolved = detail ?? workshop
    const isAuthor = currentUsername && resolved.author.username === currentUsername
    const isActive = resolved.status === 'SCHEDULED'
    const canJoin = !isAuthor && isActive && !resolved.is_full && !resolved.current_user_enrolled && Boolean(currentUsername)
    const canLeave = !isAuthor && resolved.current_user_enrolled && Boolean(currentUsername)

    async function handleJoin() {
        try {
            await joinMutation.mutateAsync(workshop!.id)
            toast.success('You joined the workshop!')
        } catch {
            toast.error('Failed to join workshop. Please try again.')
        }
    }

    async function handleLeave() {
        try {
            await leaveMutation.mutateAsync(workshop!.id)
            toast.success('You left the workshop.')
        } catch {
            toast.error('Failed to leave workshop. Please try again.')
        }
    }

    async function handleCancel() {
        try {
            await deleteMutation.mutateAsync(workshop!.id)
            toast.success('Workshop cancelled.')
            setConfirmCancel(false)
            onClose()
        } catch {
            toast.error('Failed to cancel workshop. Please try again.')
        }
    }

    const participants = detail?.participants ?? []

    return (
        <>
            <Dialog open={open && !editOpen} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-start gap-3 pr-6">
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-lg leading-snug">{resolved.title}</DialogTitle>
                                <Muted className="text-sm mt-0.5">{resolved.community_name}</Muted>
                            </div>
                            <WorkshopStatusBadge status={resolved.status} isFull={resolved.is_full} />
                        </div>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 mt-2">
                        {/* Date & Time */}
                        <div className="flex flex-col gap-1.5 bg-surface-alt rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-ink">
                                <Calendar className="w-4 h-4 shrink-0 text-accent" />
                                {formatDate(resolved.scheduled_at)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-ink-soft">
                                <Clock className="w-4 h-4 shrink-0" />
                                {formatTime(resolved.scheduled_at)} – {formatTime(resolved.end_at)}
                            </div>
                            {resolved.max_participants > 0 && (
                                <div className={cn('flex items-center gap-2 text-sm font-medium', resolved.is_full ? 'text-amber-600' : 'text-ink-soft')}>
                                    <Users className="w-4 h-4 shrink-0" />
                                    {resolved.participant_count}/{resolved.max_participants} Enrolled
                                </div>
                            )}
                        </div>

                        {/* Host */}
                        <div className="flex items-center gap-3">
                            {resolved.author.picture_url ? (
                                <img src={getAbsoluteMediaUrl(resolved.author.picture_url)} alt={resolved.author.display_name} className="h-9 w-9 rounded-full object-cover border border-white/50 shrink-0" />
                            ) : (
                                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-white/50', avatarColor(resolved.author.display_name))}>
                                    {miniInitials(resolved.author.display_name)}
                                </div>
                            )}
                            <div>
                                <Link to="/profiles/$username" params={{ username: resolved.author.username }} className="text-sm font-medium text-ink hover:underline">
                                    {resolved.author.display_name}
                                </Link>
                                {resolved.author.title && <p className="text-xs text-ink-soft">{resolved.author.title}</p>}
                                <p className="text-xs text-ink-soft">Host</p>
                            </div>
                        </div>

                        {/* Description */}
                        {resolved.description && (
                            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{resolved.description}</p>
                        )}

                        {/* Participants */}
                        {(resolved.current_user_enrolled || isAuthor) && (
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-semibold text-ink">Participants</p>
                                {detailLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-ink-soft" /></div>
                                ) : participants.length === 0 ? (
                                    <Muted className="text-sm">No participants yet.</Muted>
                                ) : (
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                                        {participants.map(p => (
                                            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2">
                                                {p.participant.picture_url ? (
                                                    <img src={getAbsoluteMediaUrl(p.participant.picture_url)} alt={p.participant.display_name} className="h-7 w-7 rounded-full object-cover border border-white/50 shrink-0" />
                                                ) : (
                                                    <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(p.participant.display_name))}>
                                                        {miniInitials(p.participant.display_name)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <Link to="/profiles/$username" params={{ username: p.participant.username }} className="text-sm font-medium text-ink hover:underline truncate block">
                                                        {p.participant.display_name}
                                                    </Link>
                                                    {p.participant.username === workshop.author.username && (
                                                        <span className="text-xs text-accent font-medium">Host</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cancel confirmation inline */}
                        {confirmCancel && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-700">Cancel this workshop?</p>
                                    <p className="text-xs text-red-600 mt-0.5">This will notify all participants. This action cannot be undone.</p>
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={handleCancel}>
                                            {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, Cancel Workshop'}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setConfirmCancel(false)}>Keep</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4 flex flex-wrap gap-2 border-t border-line">
                        {Boolean(isAuthor) && isActive && !confirmCancel && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit Workshop</Button>
                                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmCancel(true)}>
                                    Cancel Workshop
                                </Button>
                            </>
                        )}
                        {canLeave && (
                            <Button variant="outline" size="sm" disabled={leaveMutation.isPending} onClick={handleLeave}>
                                {leaveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Leave Workshop'}
                            </Button>
                        )}
                        {canJoin && (
                            <Button size="sm" disabled={joinMutation.isPending} className="bg-accent hover:bg-accent/90 text-white" onClick={handleJoin}>
                                {joinMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join Workshop'}
                            </Button>
                        )}
                        {!currentUsername && isActive && !resolved.is_full && (
                            <p className="text-xs text-ink-soft italic">Sign in to join this workshop.</p>
                        )}
                        <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {editOpen && (
                <CreateWorkshopDialog
                    tagId={tagId}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    editWorkshop={workshop}
                />
            )}
        </>
    )
}