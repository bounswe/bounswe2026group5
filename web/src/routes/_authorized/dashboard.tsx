// web/src/routes/_authorized/dashboard.tsx
import { meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { useMeetingSessions, useMyRequests, useRespondToRequest, matchFeedbackQueryOptions } from "#/lib/queries/MentorshipQueries.ts"
import { useOwnProfile } from "#/lib/queries/ProfileQueries.ts"
import { useNotifications, useMarkAllNotificationsRead, NOTIFICATION_INVALIDATION_MAP } from "#/lib/queries/NotificationQueries.ts"
import { getInitials } from "#/lib/utils.ts"
import { Body, Heading, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Bell, CalendarDays, Check, CheckCircle2, Clock, Loader2, Star, XCircle, X as XIcon, ShieldCheck, Users, AlertTriangle, Info } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from "react"
import type { Notification } from "#/lib/queries/NotificationQueries.ts"
import { RatingModal } from '#/components/RatingModal.tsx'
import { SessionManagementModal } from '#/components/dashboard/SessionManagementModal.tsx'
import { toast } from "sonner"
import type { MeetingSession } from '#/lib/queries/MentorshipQueries.ts'

function toSessionManagementData(session: MeetingSession) {
  return {
    id: session.session_id,
    title: `Session with ${session.mentor.display_name}`,
    description: '',
    startAt: session.scheduled_start_at,
    endAt: session.scheduled_end_at,
    type: 'video' as const,
    status: 'upcoming' as const,
    host: {
      id: session.mentor.username,
      username: session.mentor.username,
      fullName: session.mentor.display_name,
      avatarUrl: session.mentor.picture_url,
      role: 'mentor' as const,
    },
    attendee: {
      id: session.mentee?.username ?? '',
      username: session.mentee?.username ?? '',
      fullName: session.mentee?.display_name ?? '',
      avatarUrl: session.mentee?.picture_url ?? '',
      role: 'mentee' as const,
    },
  }
}


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
  const initials = (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2)
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

  const { data } = useQuery(meQueryOptions)
  const { data: notifications = [] } = useNotifications()
  const { mutate: markAllRead } = useMarkAllNotificationsRead()
  const queryClient = useQueryClient()

  const sessionUnreadIds = useRef<Set<string>>(new Set())

  // Track notifications that were unread at any point during this component's lifecycle.
  // This allows them to stay visible even after they are marked as read in the backend.
  notifications.forEach(n => {
    if (!n.is_read) {
      sessionUnreadIds.current.add(n.id)
    }
  })

  const displayNotifications = useMemo(() => {
    return notifications
      .filter(n => !n.is_read || sessionUnreadIds.current.has(n.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [notifications])

  const seenIds = useRef<Set<string>>(new Set())
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (notifications.length === 0) return

    const incoming = notifications.filter(n => !seenIds.current.has(n.id))
    if (incoming.length === 0) return

    incoming.forEach(n => seenIds.current.add(n.id))
    
    // Mark genuinely new unread notifications as read
    const unreadIds = incoming.filter(n => n.type !== 'new_message' && !n.is_read).map(n => n.id)
    if (unreadIds.length > 0) markAllRead(unreadIds)

    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    const keysToInvalidate = new Set<string>()
    for (const n of incoming) {
      if (NOTIFICATION_INVALIDATION_MAP[n.type]) {
        for (const key of NOTIFICATION_INVALIDATION_MAP[n.type]) {
          keysToInvalidate.add(JSON.stringify(key))
        }
      }
    }
    keysToInvalidate.forEach(k => queryClient.invalidateQueries({ queryKey: JSON.parse(k) }))
  }, [notifications, markAllRead, queryClient])

  const mode = (data?.app_usage_mode?.toLowerCase() as 'mentor' | 'mentee' | 'admin') ?? 'mentee'
  return (
    <div className="page-wrap py-10 rise-in flex flex-col gap-10">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Heading as="h2">
            {mode === 'mentor' ? 'Mentor Dashboard' : mode === 'admin' ? 'Administrator Dashboard' : 'Mentee Dashboard'}
          </Heading>
          <Body className="text-ink-soft max-w-xl">
            {mode === 'mentor'
              ? 'Review incoming mentorship requests and manage your upcoming teaching sessions.'
              : mode === 'admin'
              ? 'Manage platform users, review reports, and ensure the community stays safe.'
              : 'Track your learning goals, view the status of your requests, and prepare for upcoming sessions.'}
          </Body>
        </div>
        {mode === 'mentor' && (
          <Link to="/profiles/$username" params={{ username: data?.username ?? '' }} hash="availability" className="shrink-0 mt-1">
            <Button variant="outline" size="sm">+ Add Availability</Button>
          </Link>
        )}
      </div>

      {displayNotifications.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading as="h3" className="text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" aria-hidden="true" />
            Notifications
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {displayNotifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </section>
      )}

      {mode === 'mentor' ? (
        <MentorDashboardView />
      ) : mode === 'admin' ? (
        <AdminDashboardView />
      ) : (
        <MenteeDashboardView />
      )}
    </div>
  )
}

function AdminDashboardView() {
  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="island-shell border-line bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              Platform Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Body className="text-ink-soft mb-6">
              Access the moderation panel to manage users, handle reports, and oversee platform activity.
            </Body>
            <Link to="/admin-moderation">
              <Button className="w-full bg-accent hover:bg-accent-dark text-white shadow-sm transition-all active:scale-[0.98]">
                Open Admin Panel
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="island-shell border-line bg-white shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <Body className="text-ink-soft italic text-center">
              Stats overview coming soon in the next update.
            </Body>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MENTEE VIEW
// ---------------------------------------------------------------------------

function MenteeDashboardView() {
  const { data: me } = useQuery(meQueryOptions)
  const { data: ownProfile } = useOwnProfile()
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useMeetingSessions({
    role: 'mentee',
    status: 'upcoming',
  })
  const { data: pastSessions = [] } = useMeetingSessions({
    role: 'mentee',
  })
  const { data: allRequests = [], isLoading: requestsLoading } = useMyRequests()

  const [ratingMatchId, setRatingMatchId] = useState<string | null>(null)
  const [ratingMentorName, setRatingMentorName] = useState('')

  // Determine matches where the first session has fully passed and wasn't canceled.
  // Only the earliest session per match qualifies — subsequent sessions do not.
  const rateableMatches = useMemo(() => {
    const now = new Date()
    // LALALALALAAL
    // CHANGE HERE IF YOU WNAT TO MAKE NON-PASS SESSIONS NOT-RATEABLE.
    const eligible = pastSessions//.filter(
   //   s => new Date(s.scheduled_end_at) < now && s.status !== 'CANCELED'
  //  )
    const firstStart: Record<string, string> = {}
    for (const s of eligible) {
      if (!firstStart[s.match_id] || s.scheduled_start_at < firstStart[s.match_id]) {
        firstStart[s.match_id] = s.scheduled_start_at
      }
    }
    const seen = new Set<string>()
    return eligible.filter(s => {
      if (s.scheduled_start_at === firstStart[s.match_id] && !seen.has(s.match_id)) {
        seen.add(s.match_id)
        return true
      }
      return false
    })
  }, [pastSessions])

  // Fetch feedback for every rateable match in parallel to know which are already rated.
  const feedbackQueries = useQueries({
    queries: rateableMatches.map(s => matchFeedbackQueryOptions(s.match_id)),
  })
  const feedbackLoading = feedbackQueries.some(q => q.isLoading)

  const pendingMatches = rateableMatches.filter((_, i) => {
    const feedbacks = feedbackQueries[i]?.data
    return !feedbacks?.some(f => f.submitted_by.username === me?.username)
  })

  // Only show PENDING requests where I am the mentee
  const sentRequests = allRequests.filter(
      req => req.status === 'PENDING' && req.mentee.username === me?.username
  ).slice(0, 3)

  const displaySessions = upcomingSessions.slice(0, 3)

  return (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">

        {/* LEFT COLUMN: Sessions */}
        <div className="flex flex-col gap-8">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Upcoming Sessions
              {!sessionsLoading && upcomingSessions.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {upcomingSessions.length}
                </span>
              )}
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
                      <Muted>No upcoming sessions yet.</Muted>
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
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Link
                            to="/profiles/$username"
                            params={{ username: session.mentor.username }}
                            className="text-xs text-accent hover:underline underline-offset-4"
                        >
                          View profile
                        </Link>
                        <SessionManagementModal session={toSessionManagementData(session)} />
                      </div>
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

          {/* Rate Your Mentors — only shown while there are unrated matches */}
          {(feedbackLoading || pendingMatches.length > 0) && (
            <section className="space-y-5">
              <Heading as="h3" className="text-xl flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Rate Your Mentors
                {!feedbackLoading && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {pendingMatches.length}
                  </span>
                )}
              </Heading>
              {feedbackLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                </div>
              ) : (
              <div className="flex flex-col gap-3">
                {pendingMatches.map(session => (
                  <Card key={session.match_id} className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {session.mentor.picture_url ? (
                          <img
                            src={session.mentor.picture_url}
                            alt={session.mentor.display_name}
                            className="h-10 w-10 rounded-full object-cover border border-white/50 shadow-sm"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0 border border-white/50 shadow-sm">
                            {getInitials(session.mentor.display_name)}
                          </div>
                        )}
                        <div>
                          <Body className="font-medium">{session.mentor.display_name}</Body>
                          <Muted className="text-xs">
                            Session ended · {formatSessionDate(session.scheduled_end_at)}
                          </Muted>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setRatingMatchId(session.match_id)
                          setRatingMentorName(session.mentor.display_name)
                        }}
                      >
                        <Star className="w-3.5 h-3.5 mr-1.5" />
                        Rate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Sent Requests */}
        <div className="flex flex-col gap-8">
          <section className="space-y-5">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              Sent Requests
              {!requestsLoading && sentRequests.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {sentRequests.length}
                </span>
              )}
            </Heading>
            <div className="flex flex-col gap-4">
              {requestsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}

              {!requestsLoading && sentRequests.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center flex flex-col items-center gap-3">
                      <Muted>No pending requests right now.</Muted>
                      <Link to="/discover">
                        <Button variant="outline" size="sm">Find a Mentor <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Button>
                      </Link>
                    </CardContent>
                  </Card>
              )}

               {sentRequests.map(req => (
                  <Card key={req.id} className="island-shell border-line shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                    {req.is_mentor_overloaded && (
                      <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Mentor at Capacity</span>
                      </div>
                    )}
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

      {ratingMatchId && (
        <RatingModal
          matchId={ratingMatchId}
          mentorName={ratingMentorName}
          onClose={() => setRatingMatchId(null)}
        />
      )}
      </>
  )
}

// ---------------------------------------------------------------------------
// MENTOR VIEW
// ---------------------------------------------------------------------------


function MentorDashboardView() {
  const queryClient = useQueryClient()
  const { data: me } = useQuery(meQueryOptions)
  const { data: ownProfile } = useOwnProfile()
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
            if (action === 'accept') {
              toast.success('Request accepted', {
                description: 'The mentee has been notified and the session is confirmed.',
              })
            } else {
              toast.warning('Request declined', {
                description: 'The mentee has been notified.',
              })
            }
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'requests'] })
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'matches'] })
            queryClient.invalidateQueries({ queryKey: ['mentorship', 'meeting-sessions', 'me'] })
          },
          onError: (err) => {
            toast.error(err.message)
          },
        }
    )
  }

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-8 items-start">

        {/* LEFT COLUMN: Upcoming Sessions */}
        <div className="flex flex-col gap-8">
          {ownProfile?.is_overloaded && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <Body className="font-bold text-amber-900 text-sm">Capacity Warning</Body>
                <Body className="text-amber-800 text-sm leading-relaxed">
                  You currently have <strong>{ownProfile.active_matches_count}</strong> active mentorships. 
                  Make sure you have enough time for new learners before accepting more requests.
                </Body>
              </div>
            </div>
          )}
          <section className="space-y-5">
            <Heading as="h3" className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Upcoming Sessions
              {!sessionsLoading && upcomingSessions.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {upcomingSessions.length}
                </span>
              )}
            </Heading>
            <div className="flex flex-col gap-4">
              {sessionsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                  </div>
              )}

              {!sessionsLoading && upcomingSessions.length === 0 && (
                  <Card className="island-shell border-line bg-white shadow-sm">
                    <CardContent className="py-8 text-center flex flex-col items-center gap-3">
                      <Muted>No upcoming sessions in the next 7 days.</Muted>
                      <Link to="/profiles/$username" params={{ username: me?.username ?? '' }} hash="availability">
                        <Button variant="outline" size="sm">+ Add Availability</Button>
                      </Link>
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
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {session.mentee.username && (
                              <Link
                                  to="/profiles/$username"
                                  params={{ username: session.mentee.username }}
                                  className="text-xs text-accent hover:underline underline-offset-4"
                              >
                                View profile
                              </Link>
                          )}
                          <SessionManagementModal session={toSessionManagementData(session)} />
                        </div>
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
            <Heading as="h3" className="text-xl flex items-center gap-2">
              Incoming Requests
              {!requestsLoading && displayRequests.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </Heading>
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
                      {req.is_mentor_overloaded && (
                        <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">At Capacity</span>
                          <span className="text-[11px] text-amber-600 font-medium">— You already have many active sessions.</span>
                        </div>
                      )}
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