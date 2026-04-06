import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Heading, Body } from '@/components/Typography'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Globe, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { useUpcomingSessions } from '#/lib/queries/MentorshipQueries.ts'
import { useMentorUpcomingSessions } from '#/lib/queries/ProfileTimeSlotQueries.ts'
import { getInitials } from '#/lib/utils.ts'

export const Route = createFileRoute('/_authorized/schedule')({
  component: SchedulePage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NormalizedSession {
  id: string
  isoDate: string
  startTime: string
  endTime: string
  peerName: string
  peerUsername: string
  peerPicture: string | null
  peerTitle: string | null
  status: 'Upcoming' | 'Completed'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPast(isoDate: string, endTime: string): boolean {
  return new Date(`${isoDate}T${endTime}`) < new Date()
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Table Component
// ---------------------------------------------------------------------------

function ScheduleTable({ sessions, peerLabel }: { sessions: NormalizedSession[], peerLabel: string }) {
  if (sessions.length === 0) {
    return (
        <div className="p-12 text-center flex flex-col items-center justify-center border-t border-line">
          <CalendarIcon className="w-10 h-10 text-ink-soft/30 mb-3" />
          <Body className="text-ink-soft">No sessions scheduled for this selection.</Body>
        </div>
    )
  }

  return (
      <div className="overflow-x-auto border-t border-line">
        <Table>
          <TableHeader className="bg-black/[0.02]">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="w-[150px] font-semibold text-ink pl-6 py-4">Date</TableHead>
              <TableHead className="w-[150px] font-semibold text-ink py-4">Time</TableHead>
              <TableHead className="font-semibold text-ink py-4">{peerLabel}</TableHead>
              <TableHead className="w-[120px] font-semibold text-ink pr-6 py-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map(session => (
                <TableRow key={session.id} className="border-line hover:bg-black/[0.01]">
                  <TableCell className="font-medium pl-6 py-4">
                    {new Date(`${session.isoDate}T00:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-ink-soft py-4">
                    {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {session.peerPicture ? (
                          <img
                              src={session.peerPicture}
                              alt={session.peerName}
                              className="h-7 w-7 rounded-full object-cover border border-white/50 shadow-sm"
                          />
                      ) : (
                          <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(session.peerName)}
                          </div>
                      )}
                      <div>
                        <Link
                            to="/profiles/$username"
                            params={{ username: session.peerUsername }}
                            className="text-sm font-medium hover:text-accent hover:underline underline-offset-4 transition-colors"
                        >
                          {session.peerName}
                        </Link>
                        {session.peerTitle && (
                            <p className="text-xs text-ink-soft">{session.peerTitle}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 py-4">
                    <Badge
                        variant="secondary"
                        className={`font-normal ${
                            session.status === 'Completed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-green-100 text-green-800'
                        }`}
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SchedulePage() {
  const { data: me } = useQuery(meQueryOptions)
  const isMentor = me?.app_usage_mode === 'MENTOR'

  const { data: menteeSessions = [], isLoading: menteeLoading } = useUpcomingSessions()
  const { sessions: mentorSlots, profilesByUsername, isLoading: mentorLoading } = useMentorUpcomingSessions(me?.username ?? '')

  const isLoading = isMentor ? mentorLoading : menteeLoading

  const rawSessions: NormalizedSession[] = useMemo(() => {
    if (isMentor) {
      return mentorSlots.map(slot => {
        const profile = slot.bookedBy ? profilesByUsername[slot.bookedBy] : null
        return {
          id: slot.id,
          isoDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          peerName: profile?.full_name ?? slot.bookedBy ?? 'Unknown',
          peerUsername: slot.bookedBy ?? '',
          peerPicture: profile?.picture_url ?? null,
          peerTitle: null,
          status: isPast(slot.date, slot.endTime) ? 'Completed' : 'Upcoming',
        }
      })
    } else {
      return menteeSessions.map(session => ({
        id: session.slot_id,
        isoDate: session.slot_date,
        startTime: session.slot_start_time,
        endTime: session.slot_end_time,
        peerName: session.mentor.display_name,
        peerUsername: session.mentor.username,
        peerPicture: session.mentor.picture_url,
        peerTitle: session.mentor.title,
        status: isPast(session.slot_date, session.slot_end_time) ? 'Completed' : 'Upcoming',
      }))
    }
  }, [isMentor, mentorSlots, profilesByUsername, menteeSessions])

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return ''
    const [year, month, day] = selectedDate.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }, [selectedDate])

  const filteredSessions = selectedDate
      ? rawSessions.filter(s => s.isoDate === selectedDate)
      : rawSessions

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const endDate = new Date(lastDay)
    if (endDate.getDay() !== 6) endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
    const days = []
    let d = new Date(startDate)
    while (d <= endDate) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
    return days
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  return (
      <div className="page-wrap py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-2">
          <Heading as="h1" className="text-3xl sm:text-4xl">
            {isMentor ? 'Teaching Schedule' : 'Learning Schedule'}
          </Heading>
          <Body className="text-ink-soft max-w-2xl">
            {isMentor
                ? 'Manage your upcoming tutoring sessions.'
                : 'Keep track of your upcoming classes and learning history.'}
          </Body>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        ) : (
            <Card className="island-shell overflow-hidden border-line flex flex-col">

              {/* Calendar */}
              <div className="p-6 bg-black/[0.01]">
                <div className="flex items-center justify-between mb-6">
                  <Heading as="h3" className="text-xl">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Heading>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 text-xs font-medium text-ink-soft">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Upcoming
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      Completed
                    </div>
                  </div>
                  <div className="text-xs text-ink-soft flex items-center gap-1.5 bg-black/[0.03] px-2 py-1 rounded-md">
                    <Globe className="w-3.5 h-3.5" /> All times in your local timezone
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-line/50 rounded-lg overflow-hidden border border-line">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="bg-white py-2 text-center text-xs font-semibold text-ink-soft">
                        {day}
                      </div>
                  ))}

                  {calendarDays.map((date, i) => {
                    const iso = toIso(date)
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    const dayEvents = rawSessions.filter(s => s.isoDate === iso)
                    const isSelected = selectedDate === iso
                    const today = new Date()
                    const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear()

                    return (
                        <div
                            key={i}
                            onClick={() => setSelectedDate(isSelected ? null : iso)}
                            className={`bg-white min-h-[80px] sm:min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-accent/5 ${
                                !isCurrentMonth ? 'opacity-40 bg-black/[0.02]' : ''
                            } ${isSelected ? 'ring-2 ring-inset ring-accent bg-accent/5' : ''}`}
                        >
                          <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                              isSelected ? 'bg-accent text-white' :
                                  isToday ? 'bg-ink text-white shadow-md' : 'text-ink'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="flex flex-col gap-1">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={`text-[10px] leading-tight px-1.5 py-1 rounded font-medium truncate ${
                                        isPast(event.isoDate, event.endTime)
                                            ? 'bg-gray-100 text-gray-600'
                                            : 'bg-green-100 text-green-800'
                                    }`}
                                >
                                  {event.startTime.slice(0, 5)} {event.peerName}
                                </div>
                            ))}
                          </div>
                        </div>
                    )
                  })}
                </div>
              </div>

              {/* List header */}
              <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-line">
                <Heading as="h4" className="text-lg">
                  {selectedDate ? `Sessions for ${formattedSelectedDate}` : 'All Sessions'}
                </Heading>
                {selectedDate && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="h-8 text-ink-soft hover:text-ink">
                      Clear Filter <X className="w-4 h-4 ml-1" />
                    </Button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white">
                <ScheduleTable
                    sessions={filteredSessions}
                    peerLabel={isMentor ? 'Student' : 'Mentor'}
                />
              </div>

            </Card>
        )}
      </div>
  )
}