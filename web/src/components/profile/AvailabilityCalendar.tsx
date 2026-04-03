import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Muted } from '@/components/Typography'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { AvailabilitySlot } from '#/lib/queries/ProfileQueries.ts'
import { useBookSlot, useCreateSlot, useDeleteSlot } from '#/lib/queries/ProfileTimeSlotQueries.ts'
import { useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityCalendarProps {
    username: string
    slots: AvailabilitySlot[]
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
    return date.toISOString().split('T')[0]
}

function formatDayHeader(date: Date): { weekday: string; date: string } {
    return {
        weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }
}

function formatTime(timeStr: string): string {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(h), parseInt(m))
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function generate30MinSlots(): string[] {
    const slots: string[] = []
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
        }
    }
    return slots
}

const TIME_SLOTS = generate30MinSlots()
const TODAY = toDateString(new Date())

// ---------------------------------------------------------------------------
// Book Modal
// ---------------------------------------------------------------------------

interface BookModalProps {
    slot: AvailabilitySlot
    username: string
    onClose: () => void
    onSuccess: () => void
}

function BookModal({ slot, username, onClose, onSuccess }: BookModalProps) {
    const [message, setMessage] = useState('')
    const bookSlot = useBookSlot(username)

    const handleBook = () => {
        bookSlot.mutate(
            { slotId: slot.id, message: message.trim() || undefined },
            { onSuccess }
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-3xl island-shell shadow-2xl flex flex-col">
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">Book this slot</h2>
                        <Muted className="text-sm mt-0.5">
                            {slot.date} • {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                        </Muted>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium text-ink">
                            Message <span className="text-ink-soft font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Introduce yourself or describe what you'd like to work on..."
                            className="bg-background resize-none min-h-[100px]"
                            maxLength={500}
                        />
                        <Muted className="text-xs text-right">{message.length} / 500</Muted>
                    </div>
                    {bookSlot.isError && (
                        <p className="text-xs text-destructive">{bookSlot.error.message}</p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
                    <Button variant="outline" onClick={onClose} disabled={bookSlot.isPending}>Cancel</Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[90px]"
                        onClick={handleBook}
                        disabled={bookSlot.isPending}
                    >
                        {bookSlot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Book Slot'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ---------------------------------------------------------------------------
// Create Slot Modal
// ---------------------------------------------------------------------------

interface CreateSlotModalProps {
    date: string
    username: string
    onClose: () => void
    onSuccess: () => void
}

function CreateSlotModal({ date, username, onClose, onSuccess }: CreateSlotModalProps) {
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('09:30')
    const createSlot = useCreateSlot(username)

    const endTimeOptions = TIME_SLOTS.filter(t => t > startTime)

    const handleCreate = () => {
        if (endTime <= startTime) return
        createSlot.mutate(
            { date, startTime, endTime },
            { onSuccess }
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-3xl island-shell shadow-2xl flex flex-col">
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line">
                    <div>
                        <h2 className="text-lg font-semibold text-ink">Add Availability Slot</h2>
                        <Muted className="text-sm mt-0.5">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Muted>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-ink">Start Time</Label>
                            <Select value={startTime} onValueChange={v => { setStartTime(v); if (endTime <= v) setEndTime(TIME_SLOTS[TIME_SLOTS.indexOf(v) + 1] ?? v) }}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map(t => (
                                        <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-ink">End Time</Label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {endTimeOptions.map(t => (
                                        <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {createSlot.isError && (
                        <p className="text-xs text-destructive">{createSlot.error.message}</p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
                    <Button variant="outline" onClick={onClose} disabled={createSlot.isPending}>Cancel</Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[90px]"
                        onClick={handleCreate}
                        disabled={createSlot.isPending}
                    >
                        {createSlot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Slot'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ---------------------------------------------------------------------------
// Day Column
// ---------------------------------------------------------------------------

interface DayColumnProps {
    date: Date
    slots: AvailabilitySlot[]
    isOwner: boolean
    isAuthenticated: boolean
    isToday: boolean
    onSlotClick: (slot: AvailabilitySlot) => void
    onAddSlot: (dateStr: string) => void
    onDeleteSlot: (slotId: string) => void
    isDeletingSlotId: string | null
}

function DayColumn({ date, slots, isOwner, isAuthenticated, isToday, onSlotClick, onAddSlot, onDeleteSlot, isDeletingSlotId }: DayColumnProps) {
    const { weekday, date: dateLabel } = formatDayHeader(date)
    const dateStr = toDateString(date)
    const isPast = dateStr < TODAY

    return (
        <div className={`flex flex-col gap-2 min-w-0 ${isPast ? 'opacity-60' : ''}`}>
            {/* Day header */}
            <div className={`text-center py-2 px-1 rounded-xl ${isToday ? 'bg-accent text-white' : 'bg-accent-muted/40'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-white' : 'text-ink-soft'}`}>{weekday}</p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-white' : 'text-ink'}`}>{dateLabel}</p>
            </div>

            {/* Slots */}
            <div className="flex flex-col gap-1.5 flex-1">
                {slots.length === 0 && (
                    <div className="flex items-center justify-center h-12 rounded-lg border border-dashed border-line">
                        <Muted className="text-xs">No slots</Muted>
                    </div>
                )}

                {slots.map(slot => (
                    <div
                        key={slot.id}
                        className={`relative group rounded-lg border px-2 py-1.5 text-xs transition-all ${
                            slot.is_booked
                                ? 'bg-black/[0.04] border-line text-ink-soft cursor-default'
                                : isAuthenticated && !isOwner && !isPast
                                    ? 'bg-accent/10 border-accent/30 text-accent cursor-pointer hover:bg-accent/20'
                                    : 'bg-green-50 border-green-200 text-green-700'
                        }`}
                        onClick={() => !slot.is_booked && isAuthenticated && !isOwner && !isPast && onSlotClick(slot)}
                    >
                        <p className="font-medium">{formatTime(slot.startTime)}</p>
                        <p className="text-[10px] opacity-70">{formatTime(slot.endTime)}</p>
                        {slot.is_booked && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">Booked</Badge>
                        )}

                        {/* Delete button for owner */}
                        {isOwner && !slot.is_booked && (
                            <button
                                onClick={e => { e.stopPropagation(); onDeleteSlot(slot.id) }}
                                disabled={isDeletingSlotId === slot.id}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-red-100 hover:text-red-600 transition-all"
                            >
                                {isDeletingSlotId === slot.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Trash2 className="h-3 w-3" />
                                }
                            </button>
                        )}
                    </div>
                ))}

                {/* Add slot button for owner */}
                {isOwner && !isPast && (
                    <button
                        onClick={() => onAddSlot(dateStr)}
                        className="flex items-center justify-center gap-1 h-8 rounded-lg border border-dashed border-accent/40 text-accent/60 hover:border-accent hover:text-accent hover:bg-accent/5 transition-all text-xs"
                    >
                        <Plus className="h-3 w-3" />
                        Add
                    </button>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AvailabilityCalendar({ username, slots, isOwner, isAuthenticated }: AvailabilityCalendarProps) {
    const queryClient = useQueryClient()
    const [weekOffset, setWeekOffset] = useState(0)
    const [bookingSlot, setBookingSlot] = useState<AvailabilitySlot | null>(null)
    const [creatingForDate, setCreatingForDate] = useState<string | null>(null)
    const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)

    const deleteSlot = useDeleteSlot(username)

    const monday = addDays(getMonday(new Date()), weekOffset * 7)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

    const slotsByDate = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = []
        acc[slot.date].push(slot)
        return acc
    }, {})

    const weekLabel = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${addDays(monday, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

    const invalidateProfile = () => {
        queryClient.invalidateQueries({ queryKey: ['profiles', username] })
    }

    const handleDeleteSlot = (slotId: string) => {
        setDeletingSlotId(slotId)
        deleteSlot.mutate(slotId, {
            onSuccess: () => {
                invalidateProfile()
                setDeletingSlotId(null)
            },
            onError: () => setDeletingSlotId(null),
        })
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
                                variant="ghost"
                                size="sm"
                                onClick={() => setWeekOffset(o => Math.max(o - 1, -4))}
                                disabled={weekOffset <= -4}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-ink-soft min-w-[140px] text-center">{weekLabel}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setWeekOffset(o => Math.min(o + 1, 4))}
                                disabled={weekOffset >= 4}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map(day => (
                            <DayColumn
                                key={toDateString(day)}
                                date={day}
                                slots={slotsByDate[toDateString(day)] ?? []}
                                isOwner={isOwner}
                                isAuthenticated={isAuthenticated}
                                isToday={toDateString(day) === TODAY}
                                onSlotClick={setBookingSlot}
                                onAddSlot={setCreatingForDate}
                                onDeleteSlot={handleDeleteSlot}
                                isDeletingSlotId={deletingSlotId}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {bookingSlot && (
                <BookModal
                    slot={bookingSlot}
                    username={username}
                    onClose={() => setBookingSlot(null)}
                    onSuccess={() => {
                        invalidateProfile()
                        setBookingSlot(null)
                    }}
                />
            )}

            {creatingForDate && (
                <CreateSlotModal
                    date={creatingForDate}
                    username={username}
                    onClose={() => setCreatingForDate(null)}
                    onSuccess={() => {
                        invalidateProfile()
                        setCreatingForDate(null)
                    }}
                />
            )}
        </>
    )
}