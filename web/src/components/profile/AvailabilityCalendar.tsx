import { meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import {
    useCancelSession,
    useMyMatches,
    useMyRequests,
    useSendMentorshipRequest
} from '#/lib/queries/MentorshipQueries.ts'
import {
    useAvailabilitySlots,
    useBookSlot,
    useCreateSlot,
    useDeleteSlot,
    type AvailabilitySlot,
} from '#/lib/queries/ProfileTimeSlotQueries.ts'
import { Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from "sonner"
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityCalendarProps {
    username: string
    isOwner: boolean
    isAuthenticated: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

function toDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function formatDayHeader(date: Date): { weekday: string; date: string } {
    return {
        weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8am to 9pm
const TODAY = toDateString(new Date())

function formatHour(h: number): string {
    return new Date(0, 0, 0, h).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Cancel Confirm Modal
// ---------------------------------------------------------------------------

interface CancelModalProps {
    slot: AvailabilitySlot
    username: string
    onClose: () => void
    onSuccess: () => void
}

function CancelModal({ slot, username, onClose, onSuccess }: CancelModalProps) {
    const cancelSession = useCancelSession()

    const handleCancel = () => {
        if (!slot.sessionId) return
        cancelSession.mutate(slot.sessionId, {
            onSuccess: () => {
                toast.warning('Session cancelled', {
                    description: 'The booking has been removed and the slot is available again.',
                })
                onSuccess()
            },
            onError: (err) => {
                toast.error(err.message)
            },
        })
    }
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm rounded-3xl island-shell shadow-2xl flex flex-col">
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line">
                    <h2 className="text-lg font-semibold text-ink">Cancel booking?</h2>
                    <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-5">
                    <Muted className="text-sm">
                        This slot is already booked. Cancelling will remove the mentorship session and make the slot available again.
                    </Muted>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
                     <Button variant="outline" onClick={onClose} disabled={cancelSession.isPending}>
                        Keep booking
                    </Button>
                    <Button
                        className="bg-red-500 hover:bg-red-600 text-white min-w-[90px]"
                        onClick={handleCancel}
                        disabled={cancelSession.isPending || !slot.sessionId}
                    >
                        {cancelSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel booking'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    )
}


// ---------------------------------------------------------------------------
// Booking Modal (mentee)
// ---------------------------------------------------------------------------

interface BookingModalProps {
    slot: AvailabilitySlot
    mentorUsername: string
    isFirstTime: boolean
    onClose: () => void
    onSuccess: () => void
}

function BookingModal({ slot, mentorUsername, isFirstTime, onClose, onSuccess }: BookingModalProps) {
    const [coverLetter, setCoverLetter] = useState('')
    const bookSlot = useBookSlot(mentorUsername)
    const sendRequest = useSendMentorshipRequest()

    const isPending = bookSlot.isPending || sendRequest.isPending

    const handleSubmit = () => {
        if (isFirstTime) {
            sendRequest.mutate(
                { mentor_username: mentorUsername, slot_id: slot.id, cover_letter: coverLetter },
                {
                    onSuccess: () => {
                        toast.success('Request sent!', {
                            description: 'Your mentorship request has been sent successfully.',
                        })
                        onSuccess()
                    },
                    onError: (err) => {
                        toast.error(err.message)
                    },
                }
            )
        } else {
            bookSlot.mutate(
                { slotId: slot.id },
                {
                    onSuccess: () => {
                        toast.success('Slot booked!', {
                            description: 'Your session has been confirmed.',
                        })
                        onSuccess()
                    },
                    onError: (err) => {
                        toast.error(err.message)
                    },
                }
            )
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-3xl island-shell shadow-2xl flex flex-col">
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">
                            {isFirstTime ? 'Send Mentorship Request' : 'Book this slot'}
                        </h2>
                        <Muted className="text-sm mt-0.5">
                            {isFirstTime
                                ? 'This will be your first session with this mentor. Send a request to get started.'
                                : 'You already have a match with this mentor — book directly.'}
                        </Muted>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="rounded-lg bg-accent-muted/40 px-4 py-3 border border-line text-sm text-ink-soft">
                        {new Date(`${slot.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' · '}
                        {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                    </div>

                    {isFirstTime && (
                        <div className="space-y-2">
                            <Label htmlFor="cover_letter" className="text-sm font-medium text-ink">
                                Cover Letter <span className="text-ink-soft font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                id="cover_letter"
                                value={coverLetter}
                                onChange={e => setCoverLetter(e.target.value)}
                                placeholder="Introduce yourself and tell the mentor what you'd like to work on..."
                                className="bg-background resize-none min-h-[110px]"
                                maxLength={500}
                            />
                            <Muted className="text-xs text-right">{coverLetter.length} / 500</Muted>
                        </div>
                    )}

                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[90px]"
                        onClick={handleSubmit}
                        disabled={isPending}
                    >
                        {isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : isFirstTime ? 'Send Request' : 'Book Slot'
                        }
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    )
}
// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AvailabilityCalendar({ username, isOwner, isAuthenticated }: AvailabilityCalendarProps) {
    const { data: slots = [] } = useAvailabilitySlots(username)
    const { data: myData } = useQuery(meQueryOptions)
    const queryClient = useQueryClient()
    const NOW_HOUR = new Date().getHours()
    const [weekOffset, setWeekOffset] = useState(0)
    const [cancellingSlot, setCancellingSlot] = useState<AvailabilitySlot | null>(null)
    const [bookingSlot, setBookingSlot] = useState<AvailabilitySlot | null>(null)
    const [togglingSlotKey, setTogglingSlotKey] = useState<string | null>(null)

    const createSlot = useCreateSlot(username)
    const deleteSlot = useDeleteSlot(username)

    const { data: matches = [] } = useMyMatches()
    const isMatched = matches.some(m => m.mentor.username === username || m.mentee.username === username)

    const { data: myRequests = [] } = useMyRequests()
    const pendingSlotIds = new Set(
        myRequests
            .filter(r => r.status === 'PENDING')
            .map(r => r.slot_id)
    )
    const hasPendingRequestForThisMentor = myRequests.some(
        r => r.status === 'PENDING' && 
             r.mentor?.username?.toLowerCase() === username.toLowerCase()
    )

    const monday = getMonday(addDays(new Date(), weekOffset * 7))
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

    const slotsByDateHour: Record<string, AvailabilitySlot> = {}
    for (const slot of slots) {
        const hour = parseInt(slot.startTime.split(':')[0])
        slotsByDateHour[`${slot.date}-${hour}`] = slot
    }
    const weekLabel = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${addDays(monday, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

    const invalidate = () => {
        queryClient.refetchQueries({ queryKey: ['availability-slots', username] })
        queryClient.invalidateQueries({ queryKey: ['profiles', username] })
        queryClient.invalidateQueries({ queryKey: ['mentorship', 'meeting-sessions', 'me'] })
        queryClient.invalidateQueries({ queryKey: ['mentorship', 'requests'] })
    }

    const handleCellClick = (dateStr: string, hour: number, existing: AvailabilitySlot | undefined) => {
        const key = `${dateStr}-${hour}`
        if (togglingSlotKey === key) return

        if (existing) {
            if (existing.status === 'BOOKED') return
            setTogglingSlotKey(key)
            deleteSlot.mutate(existing.id, {
                onSuccess: () => {
                    toast.warning('Slot removed', {
                        description: 'The availability slot has been removed.',
                    })
                    invalidate()
                    setTogglingSlotKey(null)
                },
                onError: (err) => {
                    toast.error(err.message)
                    setTogglingSlotKey(null)
                },
            })
        } else {
            setTogglingSlotKey(key)
            createSlot.mutate(
                {
                    date: dateStr,
                    startTime: `${String(hour).padStart(2, '0')}:00:00`,
                    endTime: `${String(hour + 1).padStart(2, '0')}:00:00`,
                },
                {
                    onSuccess: () => {
                        toast.success('Slot added', {
                            description: 'You are now available at this time.',
                        })
                        invalidate()
                        setTogglingSlotKey(null)
                    },
                    onError: (err) => {
                        toast.error(err.message)
                        setTogglingSlotKey(null)
                    },
                }
            )
        }
    }

    return (
        <>
            <Card className="border-line bg-white/70 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Availability
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setWeekOffset(o => Math.max(o - 1, -4))}
                                disabled={weekOffset <= -4}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-ink-soft min-w-[140px] text-center">{weekLabel}</span>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setWeekOffset(o => Math.min(o + 1, 4))}
                                disabled={weekOffset >= 4}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {isOwner ? (
                        <p className="text-xs text-ink-soft mt-2">
                            Click any empty slot to mark yourself as available. Click an available slot to remove it. Booked slots are locked until cancelled. Yellow slots have a pending request.
                        </p>
                    ) : (
                        <p className="text-xs text-ink-soft mt-2">
                            Green slots are available to book. Yellow slots already have a pending request. Click a green slot to request a session with this mentor.
                        </p>
                    )}
                </CardHeader>

                <CardContent>
                    <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                        <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minWidth: '560px' }}>

                            {/* Header row */}
                            <div className="sticky top-0 bg-white/90 z-10" />
                            {weekDays.map(day => {
                                const { weekday, date } = formatDayHeader(day)
                                const dateStr = toDateString(day)
                                const isToday = dateStr === TODAY
                                return (
                                    <div
                                        key={dateStr}
                                        className={`sticky top-0 z-10 text-center py-2 px-1 text-xs font-semibold border-b border-line ${
                                            isToday ? 'bg-accent text-white' : 'bg-white/90 text-ink-soft'
                                        }`}
                                    >
                                        <p className="uppercase tracking-wider">{weekday}</p>
                                        <p className={`font-bold mt-0.5 ${isToday ? 'text-white' : 'text-ink'}`}>{date}</p>
                                    </div>
                                )
                            })}

                            {/* Hour rows */}
                            {HOURS.map(hour => (
                                <>
                                    <div
                                        key={`label-${hour}`}
                                        className="flex items-center justify-end pr-2 text-xs text-ink-soft border-b border-line/50 h-14"
                                    >
                                        {formatHour(hour)}
                                    </div>

                                    {weekDays.map(day => {
                                        const dateStr = toDateString(day)
                                        const isPast = dateStr < TODAY || (dateStr === TODAY && hour < NOW_HOUR)
                                        const key = `${dateStr}-${hour}`
                                        const slot = slotsByDateHour[key]
                                        const isToggling = togglingSlotKey === key

                                        let cellContent = null
                                        let cellClass = 'border border-line/30 h-14 relative transition-all '

                                        const isMyPending = slot && pendingSlotIds.has(slot.id)
                                        const isGlobalPending = slot && slot.status === 'PENDING'
                                        const isPending = isMyPending || isGlobalPending

                                        if (isPast) {
                                            cellClass += 'bg-black/[0.02] opacity-50'
                                        } else if (slot?.status === 'BOOKED') {
                                            cellClass += 'bg-violet-50 border-violet-200'
                                            cellContent = (
                                                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                                                    <span className="text-violet-700 font-semibold text-xs">Booked</span>
                                                    {(isOwner || (slot.bookedBy == myData?.id)) && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setCancellingSlot(slot) }}
                                                            className="text-red-500 hover:text-red-700 underline text-[10px]"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        } else if (isPending) {
                                            cellClass += 'bg-amber-50 border-amber-300'
                                            cellContent = (
                                                <div className="flex items-center justify-center h-full">
                                                    <span className="text-amber-700 font-semibold text-xs">
                                                        {isOwner ? 'Pending' : (isMyPending ? 'Requested' : 'Pending')}
                                                    </span>
                                                </div>
                                            )
                                        } else if (slot) {
                                            if (isOwner) {
                                                cellClass += 'bg-accent/10 border-accent/30 cursor-pointer hover:bg-red-50 hover:border-red-200'
                                                cellContent = isToggling
                                                    ? <div className="flex items-center justify-center h-full"><Loader2 className="h-3 w-3 animate-spin text-ink-soft" /></div>
                                                    : <div className="flex items-center justify-center h-full">
                                                        <span className="text-accent font-medium text-xs">Available ✕</span>
                                                    </div>
                                            } else if (isAuthenticated) {
                                                if (hasPendingRequestForThisMentor) {
                                                    cellClass += 'bg-accent/10 border-accent/30 opacity-50'
                                                    cellContent = <div className="flex items-center justify-center h-full text-accent font-medium text-xs">Available</div>
                                                } else {
                                                    cellClass += 'bg-accent/10 border-accent/30 cursor-pointer hover:bg-accent/20'
                                                    cellContent = <div className="flex items-center justify-center h-full text-accent font-medium text-xs">Book</div>
                                                }
                                            } else {
                                                cellClass += 'bg-accent/10 border-accent/30'
                                                cellContent = <div className="flex items-center justify-center h-full text-accent font-medium text-xs">Available</div>
                                            }
                                        } else {
                                            if (isOwner) {
                                                cellClass += 'cursor-pointer hover:bg-accent/5'
                                                cellContent = isToggling
                                                    ? <div className="flex items-center justify-center h-full"><Loader2 className="h-3 w-3 animate-spin text-ink-soft" /></div>
                                                    : <div className="flex items-center justify-center h-full text-ink-soft/30 text-xs">+</div>
                                            }
                                        }

                                        return (
                                            <div
                                                key={key}
                                                className={cellClass}
                                                onClick={() => {
                                                    if (isPast || isPending || (!isOwner && hasPendingRequestForThisMentor)) return
                                                    if (isOwner && slot?.status !== 'BOOKED') {
                                                        handleCellClick(dateStr, hour, slot)
                                                    } else if (!isOwner && isAuthenticated && slot && slot.status !== 'BOOKED') {
                                                        setBookingSlot(slot)
                                                    }
                                                }}
                                            >
                                                {cellContent}
                                            </div>
                                        )
                                    })}
                                </>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {cancellingSlot && (
                <CancelModal
                    slot={cancellingSlot}
                    username={username}
                    onClose={() => setCancellingSlot(null)}
                    onSuccess={() => { invalidate(); setCancellingSlot(null) }}
                />
            )}
            {bookingSlot && (
                <BookingModal
                    slot={bookingSlot}
                    mentorUsername={username}
                    isFirstTime={!isMatched}
                    onClose={() => setBookingSlot(null)}
                    onSuccess={() => {
                        invalidate()
                        setBookingSlot(null)
                    }}
                />
            )}
        </>
    )
}