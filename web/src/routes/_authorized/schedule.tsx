// web/src/routes/_authorized/schedule.tsx
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Heading, Body } from '@/components/Typography'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { MentorAvailabilityModal } from '@/components/dashboard/MentorAvailabilityModal'

const scheduleSearchSchema = z.object({
  mode: z.enum(['mentee', 'mentor']).catch('mentee'),
})

export const Route = createFileRoute('/_authorized/schedule')({
  validateSearch: scheduleSearchSchema,
  component: SchedulePage,
})

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------
const MOCK_MENTOR_SCHEDULE = [
  { id: '1', date: 'Mar 24, 2026', isoDate: '2026-03-24', time: '14:00 - 15:00', peer: 'Ayşe Y.', subject: 'Data Structures', status: 'Upcoming' },
  { id: '6', date: 'Mar 24, 2026', isoDate: '2026-03-24', time: '16:00 - 17:00', peer: 'Mehmet K.', subject: 'System Design', status: 'Upcoming' },
  { id: '3', date: 'Mar 28, 2026', isoDate: '2026-03-28', time: '16:00 - 17:00', peer: 'Zeynep B.', subject: 'Database Systems', status: 'Upcoming' },
  { id: '4', date: 'Mar 10, 2026', isoDate: '2026-03-10', time: '13:00 - 14:00', peer: 'Ali M.', subject: 'Algorithms', status: 'Completed' },
]

const MOCK_MENTEE_SCHEDULE = [
  { id: '2', date: 'Mar 25, 2026', isoDate: '2026-03-25', time: '10:00 - 11:30', peer: 'Can K.', subject: 'Calculus II', status: 'Upcoming' },
  { id: '5', date: 'Mar 05, 2026', isoDate: '2026-03-05', time: '09:00 - 10:00', peer: 'Elif T.', subject: 'Physics I', status: 'Canceled' },
]

// ---------------------------------------------------------------------------
// DATA TABLE COMPONENT 
// ---------------------------------------------------------------------------
function ScheduleTable({ sessions, peerLabel }: { sessions: any[], peerLabel: string }) {
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
            <TableHead className="font-semibold text-ink py-4">Subject</TableHead>
            <TableHead className="w-[120px] font-semibold text-ink pr-6 py-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id} className="border-line hover:bg-black/[0.01]">
              <TableCell className="font-medium pl-6 py-4">{session.date}</TableCell>
              <TableCell className="text-ink-soft py-4">{session.time}</TableCell>
              <TableCell className="py-4">{session.peer}</TableCell>
              <TableCell className="py-4">{session.subject}</TableCell>
              <TableCell className="pr-6 py-4">
                <Badge 
                  variant="secondary" 
                  className={`font-normal ${
                    session.status === 'Upcoming' ? 'bg-green-100 text-green-800' : 
                    session.status === 'Completed' ? 'bg-gray-100 text-gray-600' : 
                    'bg-red-100 text-red-700'
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
// MAIN PAGE & CALENDAR LOGIC
// ---------------------------------------------------------------------------
export function SchedulePage() {
  const { mode } = Route.useSearch()
  
  // State for the calendar
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // Stores 'YYYY-MM-DD'
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return ''
    const [year, month, day] = selectedDate.split('-')
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }, [selectedDate])

  // Get correct mock data based on mode
  const rawSessions = mode === 'mentor' ? MOCK_MENTOR_SCHEDULE : MOCK_MENTEE_SCHEDULE

  // Filter sessions if a day is clicked
  const filteredSessions = selectedDate 
    ? rawSessions.filter(s => s.isoDate === selectedDate)
    : rawSessions

  // Calendar Math (Generates the grid of days)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Rewind to Sunday
    
    const endDate = new Date(lastDayOfMonth)
    if (endDate.getDay() !== 6) endDate.setDate(endDate.getDate() + (6 - endDate.getDay())) // Fast forward to Saturday

    const days = []
    let d = new Date(startDate)
    while (d <= endDate) {
      days.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  return (
    <div className="page-wrap py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Heading as="h1" className="text-3xl sm:text-4xl">
            {mode === 'mentor' ? 'Teaching Schedule' : 'Learning Schedule'}
          </Heading>
          <Body className="text-ink-soft max-w-2xl">
            {mode === 'mentor' 
              ? 'Manage your upcoming tutoring sessions and set your availability.'
              : 'Keep track of your upcoming classes and past learning history.'}
          </Body>
        </div>

        {mode === 'mentor' && (
          <div className="shrink-0">
            <MentorAvailabilityModal />
          </div>
        )}
      </div>

      <Card className="island-shell overflow-hidden border-line flex flex-col">
        
        {/* CUSTOM FULL-WIDTH CALENDAR */}
        <div className="p-6 bg-black/[0.01]">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-6">
            <Heading as="h3" className="text-xl">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Heading>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="w-4 h-4"/></Button>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="w-4 h-4"/></Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-line/50 rounded-lg overflow-hidden border border-line">
            {/* Day Names */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-white py-2 text-center text-xs font-semibold text-ink-soft">
                {day}
              </div>
            ))}
            
            {/* Day Cells */}
            {calendarDays.map((date, i) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              
              // Formatting for events
              const isoString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const dayEvents = rawSessions.filter(s => s.isoDate === isoString)
              const isSelected = selectedDate === isoString

              const today = new Date()
              const isToday = date.getDate() === today.getDate() && 
                              date.getMonth() === today.getMonth() && 
                              date.getFullYear() === today.getFullYear()

              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(isSelected ? null : isoString)}
                  className={`bg-white min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-accent/5 ${
                    !isCurrentMonth ? 'opacity-40 bg-black/[0.02]' : ''
                  } ${isSelected ? 'ring-2 ring-inset ring-accent bg-accent/5' : ''}`}
                >
                  {/* UPDATED: If it's today, make it a dark circle. If selected, make it an accent circle. */}
                  <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                    isSelected ? 'bg-accent text-white' : 
                    isToday ? 'bg-ink text-white shadow-md' : 'text-ink'
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  {/* Event Markers (Google Calendar Style Chips) */}
                  <div className="flex flex-col gap-1">
                    {dayEvents.map(event => {
                      // Dynamically assign colors based on the event's status
                      let chipColor = "bg-green-100 text-green-800" // Default for Upcoming
                      if (event.status === 'Completed') chipColor = "bg-gray-100 text-gray-600"
                      if (event.status === 'Canceled') chipColor = "bg-red-100 text-red-700"

                      return (
                        <div 
                          key={event.id} 
                          className={`text-[10px] leading-tight px-1.5 py-1 rounded font-medium truncate ${chipColor}`}
                        >
                          {event.time.split(' - ')[0]} {event.subject}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* LIST HEADER (Shows active filter) */}
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

        {/* DATA TABLE (Filtered by selected date) */}
        <div className="bg-white">
          {mode === 'mentor' ? (
            <ScheduleTable sessions={filteredSessions} peerLabel="Student" />
          ) : (
            <ScheduleTable sessions={filteredSessions} peerLabel="Tutor" />
          )}
        </div>

      </Card>
      
    </div>
  )
}