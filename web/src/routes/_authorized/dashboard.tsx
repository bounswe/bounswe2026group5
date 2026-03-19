// web/src/routes/_authorized/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heading, Body, Muted } from '@/components/Typography'
import { MOCK_REQUESTS, MOCK_SESSIONS, MOCK_DISCOVER_SKILLS } from '@/lib/mocks/loggedInHome' // FUTURE: These mock data imports will eventually be replaced with API calls once the backend is ready.

// 1. Define the allowed search parameters
const dashboardSearchSchema = z.object({
  mode: z.enum(['mentee', 'mentor']).catch('mentee'), // Defaults to mentee if missing
})

export const Route = createFileRoute('/_authorized/dashboard')({
  validateSearch: dashboardSearchSchema,
  component: DashboardHome,
})

function DashboardHome() {
  // 2. Grab the validated search param from the URL
  const { mode } = Route.useSearch()

  return (
    <div className="page-wrap py-8 rise-in flex flex-col gap-8">
      
      {/* Dynamic Page Header */}
      <div className="flex flex-col gap-2">
        <Heading as="h2">{mode === 'mentor' ? 'Mentor Dashboard' : 'Mentee Dashboard'}</Heading>
        <Body className="text-ink-soft">
          {mode === 'mentor' 
            ? 'Manage your incoming mentorship requests and upcoming sessions.' 
            : 'Track your learning goals, discover mentors, and view your upcoming sessions.'}
        </Body>
      </div>

      {/* Render entirely different "pages" based on the mode */}
      {mode === 'mentor' ? <MentorDashboardView /> : <MenteeDashboardView />}
      
    </div>
  )
}

// ---------------------------------------------------------------------------
// VIEW COMPONENTS
// ---------------------------------------------------------------------------

function MenteeDashboardView() {
  const outgoingRequests = MOCK_REQUESTS.filter(req => req.direction === 'outgoing')
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section className="space-y-4">
        <Heading as="h3" className="text-xl">My Upcoming Sessions</Heading>
        {MOCK_SESSIONS.map(session => (
          <Card key={session.id} className="island-shell border-line">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{session.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Body className="text-ink-soft">With {session.host.displayName}</Body>
              <Muted>Status: {session.status}</Muted>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <Heading as="h3" className="text-xl">Sent Requests</Heading>
        {outgoingRequests.map(req => (
          <Card key={req.id} className="island-shell border-line">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">To: {req.mentor.displayName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Muted className="line-clamp-2 italic">"{req.coverLetter}"</Muted>
              <div className="mt-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                {req.status}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}

function MentorDashboardView() {
  const incomingRequests = MOCK_REQUESTS.filter(req => req.direction === 'incoming')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section className="space-y-4">
        <Heading as="h3" className="text-xl">Incoming Requests</Heading>
        {incomingRequests.map(req => (
          <Card key={req.id} className="island-shell border-line">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">From: {req.mentee.displayName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Body className="text-ink-soft mb-4">"{req.coverLetter}"</Body>
              <div className="flex gap-2">
                {/* FUTURE: These will trigger API mutations to accept/reject */}
                <button className="text-sm font-medium text-accent hover:underline">Accept</button>
                <button className="text-sm font-medium text-red-500 hover:underline">Decline</button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <Heading as="h3" className="text-xl">My Listed Expertise</Heading>
        <div className="flex flex-wrap gap-3">
          {MOCK_DISCOVER_SKILLS.map(skill => (
            <div key={skill.id} className="bg-accent-muted text-ink px-4 py-2 rounded-lg border border-line">
              <span className="font-medium text-sm">{skill.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}