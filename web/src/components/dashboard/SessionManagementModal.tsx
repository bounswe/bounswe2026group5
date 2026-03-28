// web/src/components/dashboard/SessionManagementModal.tsx
import { useState } from 'react'
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
import { Body, Muted } from '@/components/Typography'
import { Link2, CalendarDays, Clock, XCircle, Calendar } from 'lucide-react'
import type { MockMeetingSession } from '@/lib/mocks/loggedInHome'

interface SessionManagementModalProps {
  session: MockMeetingSession
}

export function SessionManagementModal({ session }: SessionManagementModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetingLink.trim()) return
    // FUTURE: Trigger TanStack Query mutation to update the session's meeting link on the backend
    console.log('Saving meeting link for session', session.id, ':', meetingLink)
    setIsSaved(true)
  }

  const handleCancelSession = () => {
    // FUTURE: Trigger TanStack Query mutation to cancel the session on the backend
    console.log('Cancel session placeholder for session:', session.id)
  }

  const handleReschedule = () => {
    // FUTURE: Open a date/time picker flow to reschedule the session
    console.log('Reschedule placeholder for session:', session.id)
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
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setIsSaved(false) }}>
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

          {/* Placeholder Actions */}
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
              >
                <XCircle className="w-4 h-4" />
                Cancel Session
              </Button>
            </div>
          </div>

        </div>

        <DialogFooter className='border-line'>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-line text-ink-soft">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
