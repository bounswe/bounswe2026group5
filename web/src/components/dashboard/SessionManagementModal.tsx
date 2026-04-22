// web/src/components/dashboard/SessionManagementModal.tsx
import { useCancelSession, useRescheduleSession } from '#/lib/queries/MentorshipQueries.ts'
import { useAvailabilitySlots, type AvailabilitySlot } from '#/lib/queries/ProfileTimeSlotQueries.ts'
import { Body, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, Link2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// ---- Types ----

interface SessionParticipant {
  id: string
  username: string
  fullName: string
  avatarUrl?: string
  role: 'mentor' | 'mentee'
}

interface SessionManagementData {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  type: 'video' | 'in-person'
  status: 'upcoming' | 'completed' | 'cancelled'
  host: SessionParticipant
  attendee: SessionParticipant
}

interface SessionManagementModalProps {
  session: SessionManagementData
}

// ---- Helpers ----

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ---- Reschedule View ----

interface RescheduleViewProps {
  sessionId: string
  mentorUsername: string
  onBack: () => void
  onSuccess: () => void
}

function RescheduleView({ sessionId, mentorUsername, onBack, onSuccess }: RescheduleViewProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const reschedule = useRescheduleSession()
  const { data: slots = [], isLoading } = useAvailabilitySlots(mentorUsername)

  const monday = getMonday(addDays(new Date(), weekOffset * 7))
  const weekDayStrings = Array.from({ length: 7 }, (_, i) => toDateString(addDays(monday, i)))
  const weekLabel = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${addDays(monday, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const slotsThisWeek = slots
    .filter((s: AvailabilitySlot) => s.status === 'AVAILABLE' && weekDayStrings.includes(s.date))
    .sort((a: AvailabilitySlot, b: AvailabilitySlot) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

  const handleConfirm = () => {
    if (!selectedSlotId) return
    reschedule.mutate(
      { sessionId, newSlotId: selectedSlotId },
      {
        onSuccess: () => {
          toast.success('Session rescheduled', {
            description: 'Your session has been moved to the new time slot.',
          })
          queryClient.invalidateQueries({ queryKey: ['mentorship', 'meeting-sessions', 'me'] })
          queryClient.invalidateQueries({ queryKey: ['availability-slots', mentorUsername] })
          onSuccess()
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-md p-1 hover:bg-black/5 transition-colors text-ink-soft hover:text-ink -ml-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          Pick a New Time Slot
        </DialogTitle>
        <DialogDescription>
          Select an available slot from {mentorUsername}'s calendar.
        </DialogDescription>
      </DialogHeader>

      {/* Week navigation */}
      <div className="flex items-center justify-between py-1">
        <Button
          variant="ghost" size="sm"
          onClick={() => { setWeekOffset(o => o - 1); setSelectedSlotId(null) }}
          disabled={weekOffset === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Muted className="text-sm font-medium">{weekLabel}</Muted>
        <Button
          variant="ghost" size="sm"
          onClick={() => { setWeekOffset(o => o + 1); setSelectedSlotId(null) }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Slot list */}
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-ink-soft" />
          </div>
        )}
        {!isLoading && slotsThisWeek.length === 0 && (
          <div className="py-8 text-center">
            <Muted className="text-sm">No available slots this week.</Muted>
          </div>
        )}
        {slotsThisWeek.map((slot: AvailabilitySlot) => {
          const isSelected = slot.id === selectedSlotId
          const label = new Date(`${slot.date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
          })
          const timeLabel = `${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}`
          return (
            <button
              key={slot.id}
              onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-accent bg-accent/5 text-ink'
                  : 'border-line bg-white hover:border-accent/40 text-ink-soft hover:text-ink'
              }`}
            >
              <Body className="text-sm font-medium">{label}</Body>
              <Muted className={`text-sm ${isSelected ? 'text-accent font-medium' : ''}`}>{timeLabel}</Muted>
            </button>
          )
        })}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} className="border-line text-ink-soft" disabled={reschedule.isPending}>
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedSlotId || reschedule.isPending}
          className="bg-accent hover:bg-accent/90 text-white min-w-[140px]"
        >
          {reschedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reschedule'}
        </Button>
      </DialogFooter>
    </>
  )
}

// ---- Main Modal ----

export function SessionManagementModal({ session }: Readonly<SessionManagementModalProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'manage' | 'reschedule'>('manage')
  const [meetingLink, setMeetingLink] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const queryClient = useQueryClient()
  const cancelSession = useCancelSession()

  const handleClose = () => {
    setIsOpen(false)
    setView('manage')
    setIsSaved(false)
  }

  const handleSaveLink = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!meetingLink.trim()) return
    // FUTURE: Trigger TanStack Query mutation to update the session's meeting link on the backend
    console.log('Saving meeting link for session', session.id, ':', meetingLink)
    setIsSaved(true)
  }

  const handleCancelSession = () => {
    cancelSession.mutate(session.id, {
      onSuccess: () => {
        toast.success('Session cancelled', {
          description: 'Your session has been cancelled.',
        })
        queryClient.invalidateQueries({ queryKey: ['mentorship', 'meeting-sessions', 'me'] })
        handleClose()
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  const handleReschedule = () => {
    setView('reschedule')
  }

  const sessionDate = new Date(session.startAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const sessionTime = new Date(session.startAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true) }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-white border-line text-ink-soft hover:text-ink hover:border-accent/30 transition-colors"
        >
          Manage Session
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px] island-shell border-line">
        {view === 'reschedule' ? (
          <RescheduleView
            sessionId={session.id}
            mentorUsername={session.host.username}
            onBack={() => setView('manage')}
            onSuccess={handleClose}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{session.title}</DialogTitle>
              <DialogDescription>
                Manage the details for this upcoming session.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5 py-2">

              {/* Session Info */}
              <div className="flex flex-col gap-2 p-4 bg-black/[0.02] rounded-lg border border-line">
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <Body className="text-sm">{sessionDate}</Body>
                </div>
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  <Clock className="w-4 h-4 shrink-0" />
                  <Body className="text-sm">{sessionTime}</Body>
                </div>
              </div>

              {/* Meeting Link Input */}
              <div className="flex flex-col gap-2">
                <Body className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-accent" />
                  Meeting Link
                </Body>
                <Muted className="text-xs text-ink-soft">
                  Paste a Zoom or Google Meet link to share with your mentee.
                </Muted>
                <form onSubmit={handleSaveLink} className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://zoom.us/j/... or meet.google.com/..."
                    value={meetingLink}
                    onChange={(e) => { setMeetingLink(e.target.value); setIsSaved(false) }}
                    className="border-line"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="shrink-0 border border-line bg-white hover:bg-black/[0.02]"
                    disabled={!meetingLink.trim()}
                  >
                    Save
                  </Button>
                </form>
                {isSaved && (
                  <Muted className="text-xs text-green-600 font-medium">
                    Meeting link saved successfully.
                  </Muted>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-line" />

              {/* Session Actions */}
              <div className="flex flex-col gap-2">
                <Body className="text-sm font-medium text-ink-soft">Session Actions</Body>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-line text-ink-soft hover:text-ink gap-1.5"
                    onClick={handleReschedule}
                  >
                    <Calendar className="w-4 h-4" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                    onClick={handleCancelSession}
                    disabled={cancelSession.isPending}
                  >
                    {cancelSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancel Session
                  </Button>
                </div>
              </div>

            </div>

            <DialogFooter className='border-line'>
              <Button variant="outline" onClick={handleClose} className="border-line text-ink-soft">
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
