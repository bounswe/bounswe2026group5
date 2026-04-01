// web/src/routes/_authorized/dashboard.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heading, Body, Muted } from '@/components/Typography'
import { MOCK_REQUESTS, MOCK_SESSIONS} from '@/lib/mocks/loggedInHome' // FUTURE: Replace with real API calls once backend is ready
import { CalendarDays, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { SessionManagementModal } from '@/components/dashboard/SessionManagementModal'
import {meQueryOptions} from "#/lib/queries/AuthQueries.ts";
import {useQuery} from "@tanstack/react-query";

const dashboardSearchSchema = z.object({
  mode: z.enum(['mentee', 'mentor']).catch('mentee'),
})

export const Route = createFileRoute('/_authorized/dashboard')({
  validateSearch: dashboardSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions),
  component: DashboardHome,
})

// ---------------------------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  let bg = 'bg-accent-muted text-ink border-line'
  let Icon = Clock

  if (status === 'PENDING') {
    bg = 'bg-yellow-50 text-yellow-700 border-yellow-200'
    Icon = Clock
  } else if (status === 'ACCEPTED' || status === 'SCHEDULED') {
    bg = 'bg-green-50 text-green-700 border-green-200'
    Icon = CheckCircle2
  } else if (status === 'REJECTED' || status === 'CANCELLED') {
    bg = 'bg-red-50 text-red-700 border-red-200'
    Icon = XCircle
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold border ${bg}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {status}
    </span>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2)
  const colors = [
    'bg-blue-100 text-blue-700', 
    'bg-emerald-100 text-emerald-700', 
    'bg-violet-100 text-violet-700', 
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700'
  ]
  const colorIndex = name.length % colors.length
  const colorClass = colors[colorIndex]

  return (
    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-white/50 shadow-sm ${colorClass}`}>
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PAGE LAYOUT
// ---------------------------------------------------------------------------

export function DashboardHome() {
  const { mode } = Route.useSearch()

  const { data, isSuccess } = useQuery(meQueryOptions)


  return (
    <div className="page-wrap py-10 rise-in flex flex-col gap-10">
      {isSuccess && (
          <p className="text-xs text-green-600">Logged in as: {data?.email}</p>
      )}
      <div className="flex flex-col gap-2">
        <Heading as="h2">{mode === 'mentor' ? 'Mentor Dashboard' : 'Mentee Dashboard'}</Heading>
        <Body className="text-ink-soft max-w-2xl">
          {mode === 'mentor' 
            ? 'Review incoming mentorship requests and manage your upcoming teaching sessions.' 
            : 'Track your learning goals, view the status of your requests, and prepare for upcoming sessions.'}
        </Body>
      </div>

      {mode === 'mentor' ? <MentorDashboardView /> : <MenteeDashboardView />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MENTEE VIEW
// ---------------------------------------------------------------------------

function MenteeDashboardView() {
  const outgoingRequests = MOCK_REQUESTS.filter(req => req.direction === 'outgoing')
  
  const displaySessions = MOCK_SESSIONS.slice(0, 3)
  const displayRequests = outgoingRequests.slice(0, 3)
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">
      
      {/* LEFT COLUMN: Sessions */}
      <div className="flex flex-col gap-8">
        <section className="space-y-5">
          <Heading as="h3" className="text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-accent" />
            Upcoming Sessions
          </Heading>
          <div className="flex flex-col gap-4">
            {displaySessions.map(session => (
              <Card key={session.id} className="island-shell border-line overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                <div className="bg-accent h-1.5 w-full" />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight">{session.title}</CardTitle>
                    <StatusBadge status={session.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <UserAvatar name={session.host.displayName} />
                  <div>
                    <Body className="font-medium">With {session.host.displayName}</Body>
                    <Muted className="text-sm flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Tomorrow, 10:00 AM
                    </Muted>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-5 bg-black/[0.02]">
                  {/* FUTURE: Opens session details modal or navigates to meeting room */}
                  <Button variant="outline" size="sm" className="w-full bg-white border-line text-ink-soft hover:text-ink hover:border-accent/30 transition-colors">
                    View Session Details
                  </Button>
                </CardFooter>
              </Card>
            ))}

            <Link to="/schedule" search={{ mode: 'mentee' }} className="block mt-2">
              <Button variant="ghost" className="w-full text-accent hover:bg-accent/10">
                View Full Schedule <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Requests */}
      <div className="flex flex-col gap-8">
        <section className="space-y-5">
          <Heading as="h3" className="text-xl">Sent Requests</Heading>
          <div className="flex flex-col gap-4">
            {displayRequests.map(req => (
              <Card key={req.id} className="island-shell border-line shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={req.mentor.displayName} />
                      <div>
                        <Body className="font-medium text-sm">To: {req.mentor.displayName}</Body>
                        <Muted className="text-xs">{req.mentor.title}</Muted>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="bg-black/[0.03] rounded-lg p-4 border border-line/50">
                    <Muted className="line-clamp-3 italic text-sm text-ink-soft leading-relaxed">"{req.coverLetter}"</Muted>
                  </div>
                </CardContent>
              </Card>
            ))}

            {outgoingRequests.length > 3 && (
              <Button variant="ghost" className="w-full text-accent hover:bg-accent/10 mt-2">
                View all {outgoingRequests.length} requests <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </section>
      </div>
      
    </div>
  )
}

// ---------------------------------------------------------------------------
// MENTOR VIEW
// ---------------------------------------------------------------------------

function MentorDashboardView() {
  const incomingRequests = MOCK_REQUESTS.filter(req => req.direction === 'incoming')
  
  const displaySessions = MOCK_SESSIONS.slice(0, 3)
  const displayRequests = incomingRequests.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">
      
      {/* LEFT COLUMN: Sessions & Expertise */}
      <div className="flex flex-col gap-10">
        
        {/* Sessions Section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Upcoming Sessions
            </Heading>            
          </div>
          
          <div className="flex flex-col gap-4">
            {displaySessions.map(session => (
              <Card key={session.id} className="island-shell border-line overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                <div className="bg-accent h-1.5 w-full" />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight">{session.title}</CardTitle>
                    <StatusBadge status={session.status} />
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <UserAvatar name="Student Name" /> 
                  <div>
                    <Body className="font-medium">With Student Name</Body>
                    <Muted className="text-sm flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Tomorrow, 10:00 AM
                    </Muted>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 pb-5 bg-black/[0.02]">
                  <SessionManagementModal session={session} />
                </CardFooter>
              </Card>
            ))}
            
            <Link to="/schedule" search={{ mode: 'mentor' }} className="block mt-2">
              <Button variant="ghost" className="w-full text-accent hover:bg-accent/10">
                View Full Schedule <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Requests */}
      <div className="flex flex-col gap-10">
        <section className="space-y-5">
          <Heading as="h3" className="text-xl">Incoming Requests</Heading>
          <div className="flex flex-col gap-4">
            {displayRequests.map(req => (
              <Card key={req.id} className="island-shell border-line border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={req.mentee.displayName} />
                    <div>
                      <CardTitle className="text-base">{req.mentee.displayName}</CardTitle>
                      <Muted className="text-xs">{req.mentee.title}</Muted>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="bg-black/[0.03] p-4 rounded-lg border border-line/50 mb-5">
                    <Body className="text-ink-soft text-sm leading-relaxed italic">
                      "{req.coverLetter}"
                    </Body>
                  </div>
                  <div className="flex gap-3">
                    {/* FUTURE: Triggers TanStack Query mutation to Django API */}
                    <Button className="flex-1 bg-accent hover:bg-accent/90 text-white shadow-sm" size="sm">
                      Accept
                    </Button>
                    <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" size="sm">
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {incomingRequests.length > 3 && (
              <Button variant="ghost" className="w-full text-accent hover:bg-accent/10 mt-2">
                View all {incomingRequests.length} requests <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </section>
      </div>

    </div>
  )
}