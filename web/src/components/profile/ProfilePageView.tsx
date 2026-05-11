import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Body, Heading, Muted } from '@/components/Typography'
import { Star, Sparkles, Pencil, ChevronLeft, ChevronRight, Calendar, Clock, Users, BookOpen } from 'lucide-react'
import { EditProfileModal } from '#/components/profile/EditProfileModal.tsx'
import { ProfilePostsSection } from '#/components/profile/ProfilePostsSection.tsx'
import { useState } from 'react'
import { getAbsoluteMediaUrl, getInitials } from '#/lib/utils.ts'
import { AvailabilityCalendar } from "#/components/profile/AvailabilityCalendar.tsx";
import { useAvailabilitySlots } from "#/lib/queries/ProfileTimeSlotQueries.ts";
import { useMentorReviews } from '#/lib/queries/ProfileQueries.ts'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useProfileWorkshopAttendance } from '#/lib/queries/WorkshopQueries.ts'
import type { WorkshopAttendanceItem, CommunityWorkshop } from '#/lib/queries/WorkshopQueries.ts'
import { WorkshopDetailModal } from '#/components/community/WorkshopDetailModal.tsx'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
interface BaseMappedProfile {
  username: string
  full_name: string
  bio: string
  show_initials_only: boolean
  picture_url: string
  skills: string[]
  app_usage_mode: "MENTOR" | "MENTEE" | "ADMIN"
  share_precise_location: boolean
}

interface MentorMappedProfile extends BaseMappedProfile {
  isMentor: true
  title: string
  average_rating: number
  total_mentee_count: number
}

interface MenteeMappedProfile extends BaseMappedProfile {
  isMentor: false
}

type MappedProfile = MentorMappedProfile | MenteeMappedProfile

interface ProfilePageViewProps {
  profile: MappedProfile
  isOwner: boolean
  isAuthenticatedViewer: boolean
}

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                />
            ))}
        </div>
    )
}

function MentorReviewsList({ username }: { username: string }) {
    const [page, setPage] = useState(1)
    const pageSize = 5
    const { data, isLoading } = useMentorReviews(username, page, pageSize)

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (!data || data.results.length === 0) {
        return <p className="text-sm text-ink-soft italic">No public reviews yet.</p>
    }

    const totalPages = Math.ceil(data.count / pageSize)

    return (
        <div className="space-y-1">
            {data.results.map((review, i) => (
                <div key={i} className="border-b border-line py-3 last:border-0">
                    <StarRow rating={review.rating} />
                    {review.text && (
                        <Body className="text-sm text-ink-soft mt-1">{review.text}</Body>
                    )}
                    <Muted className="text-xs mt-1">
                        {new Date(review.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                        })}
                    </Muted>
                </div>
            ))}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="h-7 px-2"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Muted className="text-xs">{page} / {totalPages}</Muted>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="h-7 px-2"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            )}
        </div>
    )
}


import { ReportUserDialog } from '#/components/ReportUserDialog.tsx'

// ---------------------------------------------------------------------------
// Profile Workshops Section
// ---------------------------------------------------------------------------

function attendanceToWorkshop(item: WorkshopAttendanceItem): CommunityWorkshop {
    return {
        id: item.workshop_id,
        community_id: item.community_id,
        community_name: item.community_name,
        author: item.author,
        title: item.workshop_title,
        description: item.workshop_description,
        scheduled_at: item.workshop_scheduled_at,
        end_at: item.workshop_end_at,
        max_participants: 0,
        participant_count: 0,
        is_full: false,
        status: item.workshop_status as CommunityWorkshop['status'],
        current_user_enrolled: true,
        created_at: item.joined_at,
        updated_at: item.joined_at,
    }
}

function WorkshopAttendanceCard({ item, onClick }: { item: WorkshopAttendanceItem; onClick: () => void }) {
    const isUpcoming = item.attendance_status === 'attending'
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left rounded-lg border border-line bg-white/70 px-4 py-3 flex flex-col gap-2 hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{item.workshop_title}</p>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    item.workshop_status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : item.workshop_status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : isUpcoming
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                    {item.workshop_status === 'CANCELLED' ? 'Cancelled' : isUpcoming ? 'Upcoming' : 'Attended'}
                </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {new Date(item.workshop_scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                <span className="mx-1">·</span>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {new Date(item.workshop_scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center justify-between gap-2">
                <Muted className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3 shrink-0" />
                    {item.community_name}
                </Muted>
                <span className="text-xs text-accent shrink-0">
                    by {item.author.display_name}
                </span>
            </div>
        </button>
    )
}

function ProfileWorkshopsSection({ username }: { username: string }) {
    const { data, isLoading } = useProfileWorkshopAttendance(username)
    const { data: me } = useQuery(meQueryOptions)
    const [selectedWorkshop, setSelectedWorkshop] = useState<CommunityWorkshop | null>(null)
    const workshops = data?.results ?? []

    if (isLoading) return (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-ink-soft" /></div>
    )

    if (workshops.length === 0) return null

    const upcoming = workshops.filter(w => w.attendance_status === 'attending')
    const past = workshops.filter(w => w.attendance_status === 'attended')

    return (
        <>
            <section className="island-shell rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-xl font-semibold text-ink flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-accent" />
                    Workshops
                </h2>
                {upcoming.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-medium text-ink-soft uppercase tracking-wide">Upcoming</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {upcoming.slice(0, 4).map(w => (
                                <WorkshopAttendanceCard
                                    key={w.id}
                                    item={w}
                                    onClick={() => setSelectedWorkshop(attendanceToWorkshop(w))}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {past.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-medium text-ink-soft uppercase tracking-wide">Past</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {past.slice(0, 4).map(w => (
                                <WorkshopAttendanceCard
                                    key={w.id}
                                    item={w}
                                    onClick={() => setSelectedWorkshop(attendanceToWorkshop(w))}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </section>
            <WorkshopDetailModal
                workshop={selectedWorkshop}
                tagId={selectedWorkshop?.community_id ?? ''}
                open={Boolean(selectedWorkshop)}
                onClose={() => setSelectedWorkshop(null)}
                currentUsername={me?.username}
            />
        </>
    )
}

export function ProfilePageView({ profile, isOwner, isAuthenticatedViewer }: ProfilePageViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { data: slots = [] } = useAvailabilitySlots(profile.username, profile.isMentor)

  const avatarBlock = (
      <div className="flex flex-wrap items-center gap-5">
        {profile.picture_url && !profile.show_initials_only ? (
            <img
                src={getAbsoluteMediaUrl(profile.picture_url)}
                alt={`${profile.full_name} profile picture`}
                className="h-20 w-20 rounded-2xl object-cover ring-1 ring-line"
            />
        ) : (
            <div className="h-20 w-20 rounded-2xl bg-accent text-white text-2xl font-bold flex items-center justify-center ring-1 ring-line">
              {getInitials(profile.full_name)}
            </div>
        )}

        <div className="min-w-[220px] flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Heading as="h1" className="text-3xl sm:text-4xl leading-tight">
              {profile.full_name}
            </Heading>
            <Badge className="bg-accent-muted text-ink border border-line">
              {profile.app_usage_mode === 'ADMIN' ? 'Admin' : profile.app_usage_mode === 'MENTOR' ? 'Mentor' : 'Mentee'}
            </Badge>
            {isOwner && (
                <button
                    onClick={() => setEditOpen(true)}
                    className="rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-accent-muted transition-colors"
                    aria-label="Edit profile"
                >
                  <Pencil className="h-4 w-4" />
                </button>
            )}
            {!isOwner && isAuthenticatedViewer && (
                <div className="ml-auto">
                  <ReportUserDialog reportedUsername={profile.username} />
                </div>
            )}
          </div>

          {profile.isMentor && profile.title && <Body className="text-ink-soft">{profile.title}</Body>}
        </div>
      </div>
  )

  const bioCard = (
      <Card className="border-line bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bio</CardTitle>
        </CardHeader>
        <CardContent>
          <Body className="text-ink-soft leading-7">{profile.bio || 'No bio yet.'}</Body>
        </CardContent>
      </Card>
  )

  const editModal = editOpen && (
      <EditProfileModal
          mode={profile.isMentor ? 'MENTOR' : 'MENTEE'}
          initialValues={{
            bio: profile.bio ?? '',
            title: profile.isMentor ? profile.title : undefined,
            show_initials_only: profile.show_initials_only,
            share_precise_location: profile.share_precise_location,
            skills: profile.skills,
          }}
          onClose={() => setEditOpen(false)}
      />
  )

  if (!profile.isMentor) {
    return (
        <main className="page-wrap py-10 sm:py-12 rise-in">
          <section className="island-shell rounded-3xl p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                {avatarBlock}
                {bioCard}
                <Card className="border-line bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                      Eager to Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.skills.length === 0 ? (
                        <p className="text-ink-soft italic">No skills listed</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map(skill => (
                                <span
                                    key={skill}
                                    className="px-3 py-1.5 rounded-full text-sm font-medium border bg-amber-50 text-amber-700 border-amber-200"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          <ProfileWorkshopsSection username={profile.username} />
          {isAuthenticatedViewer && (
              <ProfilePostsSection username={profile.username} isOwner={isOwner} />
          )}
          {editModal}
        </main>
    )
  }
  const openSlots = slots.filter(s => s.status !== 'BOOKED')

    // MENTOR layout — restructure to put calendar full width below
    return (
        <main className="page-wrap py-10 sm:py-12 rise-in">
            <section id="availability" className="island-shell rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8">

                {/* Top 2-col grid: left content + right snapshot */}
                <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        {avatarBlock}
                        {bioCard}
                        <Card className="border-line bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Expertise</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {profile.skills.length === 0 ? (
                                    <p className="text-ink-soft italic">No skills listed</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map(skill => (
                                            <span
                                                key={skill}
                                                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-violet-50 text-violet-700 border-violet-200"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-line bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
                                    Reviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MentorReviewsList username={profile.username} />
                            </CardContent>
                        </Card>
                    </div>

                    <aside className="space-y-4">
                        <Card className="border-line bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                                    <Muted className="text-xs uppercase tracking-wider">Average Rating</Muted>
                                    <p className="text-2xl font-semibold text-ink mt-1 flex items-center gap-1" aria-label={`Average rating: ${profile.average_rating.toFixed(1)} out of 5`}>
                                        <Star className="h-4 w-4 fill-current text-amber-500" aria-hidden="true" />
                                        {profile.average_rating.toFixed(1)}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                                    <Muted className="text-xs uppercase tracking-wider">Total Mentees</Muted>
                                    <p className="text-2xl font-semibold text-ink mt-1">{profile.total_mentee_count}</p>
                                </div>
                                <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                                    <Muted className="text-xs uppercase tracking-wider">Open Slots</Muted>
                                    <p className="text-2xl font-semibold text-ink mt-1">{openSlots.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>

                {/* Full width calendar below */}
                <AvailabilityCalendar
                    username={profile.username}
                    isOwner={isOwner}
                    isAuthenticated={isAuthenticatedViewer}
                />

            </section>
            <ProfileWorkshopsSection username={profile.username} />
            {isAuthenticatedViewer && (
                <ProfilePostsSection username={profile.username} isOwner={isOwner} />
            )}
            {editModal}
        </main>
    )
}