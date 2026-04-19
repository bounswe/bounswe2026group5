// web/src/routes/_authorized/dashboard.tsx
import { meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { useMeetingSessions, useMyRequests, useRespondToRequest } from "#/lib/queries/MentorshipQueries.ts"
import { getInitials } from "#/lib/utils.ts"
import { Body, Heading, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clock, Loader2, XCircle, X as XIcon } from 'lucide-react'
import { useState } from "react"


export const Route = createFileRoute('/_authorized/dashboard')({
  component: DashboardHome,
})

// ---------------------------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------------------------

function StatusBadge({ status }: Readonly<{ status: string }>) {
  let bg = 'bg-accent-muted text-ink border-line'
  let Icon = Clock

  if (status === 'PENDING') {
    bg = 'bg-yellow-50 text-yellow-700 border-yellow-200'
    Icon = Clock
  } else if (status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'RESCHEDULED') {
    bg = 'bg-green-50 text-green-700 border-green-200'
    Icon = CheckCircle2
  } else if (status === 'REJECTED' || status === 'CANCELLED' || status === 'CANCELED') {
    bg = 'bg-red-50 text-red-700 border-red-200'
    Icon = XCircle
  } else if (status === 'COMPLETED') {
    bg = 'bg-gray-100 text-gray-600 border-gray-200'
    Icon = CheckCircle2
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold border ${bg}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {status}
    </span>
  )
}

function UserAvatar({ name }: Readonly<{ name: string }>) {
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

  const { data, isSuccess } = useQuery(meQueryOptions)

  const mode = (data?.app_usage_mode?.toLowerCase() as 'mentor' | 'mentee') ?? 'mentee'
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
  const { data: me } = useQuery(meQueryOptions)
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useMeetingSessions({
    role: 'mentee',
    status: 'upcoming',
  })
  const { data: allRequests = [], isLoading: requestsLoading } = useMyRequests()

  // Only show PENDING requests where I am the mentee
  const sentRequests = allRequests.filter(
      req => req.status === 'PENDING' && req.mentee.username === me?.username
  ).slice(0, 3)

  const displaySessions = upcomingSessions.slice(0, 3)

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">

        {/* LEFT COLUMN: Sessions — unchanged from previous */}
        <div className="flex flex-col gap-8">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Upcoming Sessions
            </Heading>
            <div className="flex flex-col gap-4">
              {sessionsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}
              {!sessionsLoading && displaySessions.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center">
                      <Muted>No upcoming sessions in the next 7 days.</Muted>
                    </CardContent>
                  </Card>
              )}
              {displaySessions.map(session => (
                  <Card key={session.session_id} className="island-shell border-line overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                    <div className="bg-accent h-1.5 w-full" />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-lg leading-tight">
                          Session with {session.mentor.display_name}
                        </CardTitle>
                        <StatusBadge status={session.display_status} />
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {session.mentor.picture_url ? (
                            <img
                                src={session.mentor.picture_url}
                                alt={session.mentor.display_name}
                                className="h-11 w-11 rounded-full object-cover border border-white/50 shadow-sm"
                            />
                        ) : (
                            <div className="h-11 w-11 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0 border border-white/50 shadow-sm">
                              {getInitials(session.mentor.display_name)}
                            </div>
                        )}
                        <div>
                          <Body className="font-medium">{session.mentor.display_name}</Body>
                          {session.mentor.title && (
                              <Muted className="text-xs">{session.mentor.title}</Muted>
                          )}
                          <Muted className="text-sm flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatSessionDate(session.scheduled_start_at)}
                            {' · '}
                            {formatSessionTime(session.scheduled_start_at)} – {formatSessionTime(session.scheduled_end_at)}
                          </Muted>
                        </div>
                      </div>
                      <Link
                          to="/profiles/$username"
                          params={{ username: session.mentor.username }}
                          className="text-xs text-accent hover:underline underline-offset-4 shrink-0"
                      >
                        View profile
                      </Link>
                    </CardContent>
                  </Card>
              ))}
              <Link to="/schedule" className="block mt-2">
                <Button variant="ghost" className="w-full text-accent hover:bg-accent/10">
                  {upcomingSessions.length > 3
                      ? `View all ${upcomingSessions.length} sessions`
                      : 'View Full Schedule'
                  } <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Sent Requests */}
        <div className="flex flex-col gap-8">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl">Sent Requests</Heading>
            <div className="flex flex-col gap-4">
              {requestsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}

              {!requestsLoading && sentRequests.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center">
                      <Muted>No pending requests right now.</Muted>
                    </CardContent>
                  </Card>
              )}

              {sentRequests.map(req => (
                  <Card key={req.id} className="island-shell border-line shadow-sm hover:shadow-md transition-shadow bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {req.mentor.picture_url ? (
                              <img
                                  src={req.mentor.picture_url}
                                  alt={req.mentor.display_name}
                                  className="h-11 w-11 rounded-full object-cover border border-white/50 shadow-sm"
                              />
                          ) : (
                              <div className="h-11 w-11 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0 border border-white/50 shadow-sm">
                                {getInitials(req.mentor.display_name)}
                              </div>
                          )}
                          <div>
                            <Body className="font-medium text-sm">
                              To: {req.mentor.display_name}
                            </Body>
                            <Muted className="text-xs">{req.mentor.title}</Muted>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={req.status} />
                          <Link
                              to="/profiles/$username"
                              params={{ username: req.mentor.username }}
                              className="text-xs text-accent hover:underline underline-offset-4 shrink-0"
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-ink-soft bg-accent-muted/40 rounded-lg px-3 py-2 border border-line">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span>
                                            {new Date(`${req.slot_date}T00:00:00`).toLocaleDateString('en-GB', {
                                              weekday: 'short', day: 'numeric', month: 'short'
                                            })}
                          {' · '}
                          {req.slot_start_time?.slice(0, 5)} – {req.slot_end_time?.slice(0, 5)}
                                        </span>
                      </div>
                      {req.cover_letter && (
                          <div className="bg-black/3 rounded-lg p-4 border border-line/50">
                            <Muted className="line-clamp-3 italic text-sm text-ink-soft leading-relaxed">
                              "{req.cover_letter}"
                            </Muted>
                          </div>
                      )}
                    </CardContent>
                  </Card>
              ))}
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
  const queryClient = useQueryClient()
  const { data: me } = useQuery(meQueryOptions)
  const { data: allRequests = [], isLoading: requestsLoading } = useMyRequests()
  const respondToRequest = useRespondToRequest()
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useMeetingSessions({
    role: 'mentor',
    status: 'upcoming',
  })

  const pendingRequests = allRequests.filter(
      req => req.status === 'PENDING' && req.mentor.username === me?.username
  )
  const displayRequests = pendingRequests.slice(0, 3)
  const [respondedIds, setRespondedIds] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({})

  const handleRespond = (requestId: string, action: 'accept' | 'reject') => {
    respondToRequest.mutate(
        { requestId, action },
        {
          onSuccess: () => {
            setRespondedIds(prev => ({
              ...prev,
              [requestId]: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
            }))
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'requests'] })
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'matches'] })
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'meeting-sessions', 'me'] })
          },
        }
    )
  }

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">

        {/* LEFT COLUMN: Upcoming Sessions */}
        <div className="flex flex-col gap-10">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Upcoming Sessions
            </Heading>
            <div className="flex flex-col gap-4">
              {sessionsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}

              {!sessionsLoading && upcomingSessions.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center">
                      <Muted>No upcoming sessions in the next 7 days.</Muted>
                    </CardContent>
                  </Card>
              )}

              {upcomingSessions.slice(0, 3).map(session => {
                const displayName = session.mentee.display_name

                return (
                    <Card key={session.session_id} className="island-shell border-line overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                      <div className="bg-accent h-1.5 w-full" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg leading-tight">
                          Session with {displayName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {session.mentee.picture_url ? (
                              <img
                                  src={session.mentee.picture_url}
                                  alt={displayName}
                                  className="h-11 w-11 rounded-full object-cover border border-white/50 shadow-sm"
                              />
                          ) : (
                              <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0 border border-white/50 shadow-sm">
                                {getInitials(displayName)}
                              </div>
                          )}
                          <div>
                            <Body className="font-medium">{displayName}</Body>
                            <Muted className="text-sm flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatSessionDate(session.scheduled_start_at)}
                              {' · '}
                              {formatSessionTime(session.scheduled_start_at)} – {formatSessionTime(session.scheduled_end_at)}
                            </Muted>
                          </div>
                        </div>
                        {session.mentee.username && (
                            <Link
                                to="/profiles/$username"
                                params={{ username: session.mentee.username }}
                                className="text-xs text-accent hover:underline underline-offset-4 shrink-0"
                            >
                              View profile
                            </Link>
                        )}
                      </CardContent>
                    </Card>
                )
              })}

              <Link to="/schedule" className="block mt-2">
                <Button variant="ghost" className="w-full text-accent hover:bg-accent/10">
                  {upcomingSessions.length > 3
                      ? `View all ${upcomingSessions.length} sessions`
                      : 'View Full Schedule'
                  } <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Incoming Requests — unchanged */}
        <div className="flex flex-col gap-10">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl">Incoming Requests</Heading>
            <div className="flex flex-col gap-4">
              {requestsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}
              {!requestsLoading && displayRequests.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center">
                      <Muted>No pending requests right now.</Muted>
                    </CardContent>
                  </Card>
              )}
              {displayRequests.map(req => {
                const responded = respondedIds[req.id]
                return (
                    <Card key={req.id} className="island-shell border-line border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={req.mentee.display_name} />
                            <div>
                              <CardTitle className="text-base">{req.mentee.display_name}</CardTitle>
                              <Muted className="text-xs">{req.mentee.title}</Muted>
                              <p className="text-xs text-ink-soft mt-0.5">
                                {req.mentee.display_name} wants to be your mentee.
                              </p>
                            </div>
                          </div>
                          <Link
                              to="/profiles/$username"
                              params={{ username: req.mentee.username }}
                              className="text-xs text-accent hover:underline underline-offset-4 shrink-0"
                          >
                            View profile
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-5 space-y-3">
                        <p className="text-xs text-ink-soft">
                          They wanted to do your first lecture on:
                        </p>
                        <div className="flex items-center gap-2 text-xs text-ink-soft bg-accent-muted/40 rounded-lg px-3 py-2 border border-line">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>
                                                {new Date(`${req.slot_date}T00:00:00`).toLocaleDateString('en-GB', {
                                                  weekday: 'short', day: 'numeric', month: 'short'
                                                })}
                            {' · '}
                            {req.slot_start_time?.slice(0, 5)} – {req.slot_end_time?.slice(0, 5)}
                                            </span>
                        </div>
                        {req.cover_letter && (
                            <div className="bg-black/3 p-4 rounded-lg border border-line/50">
                              <Body className="text-ink-soft text-sm leading-relaxed italic">
                                "{req.cover_letter}"
                              </Body>
                            </div>
                        )}
                        {responded ? (
                            <StatusBadge status={responded} />
                        ) : (
                            <div className="flex gap-3">
                              <Button
                                  className="flex-1 bg-accent hover:bg-accent/90 text-white shadow-sm"
                                  size="sm"
                                  onClick={() => handleRespond(req.id, 'accept')}
                                  disabled={respondToRequest.isPending}
                              >
                                {respondToRequest.isPending
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <><Check className="w-3.5 h-3.5 mr-1.5" /> Accept</>
                                }
                              </Button>
                              <Button
                                  variant="outline"
                                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  size="sm"
                                  onClick={() => handleRespond(req.id, 'reject')}
                                  disabled={respondToRequest.isPending}
                              >
                                {respondToRequest.isPending
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <><XIcon className="w-3.5 h-3.5 mr-1.5" /> Decline</>
                                }
                              </Button>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                )
              })}
              {pendingRequests.length > 3 && (
                  <Button variant="ghost" className="w-full text-accent hover:bg-accent/10 mt-2">
                    View all {pendingRequests.length} requests <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
              )}
            </div>
          </section>
        </div>
      </div>
  )
}

function formatSessionDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatSessionTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}