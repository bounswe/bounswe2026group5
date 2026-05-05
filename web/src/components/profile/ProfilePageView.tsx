import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Body, Heading, Muted } from '@/components/Typography'
import { Star, Sparkles, Pencil, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { EditProfileModal } from '#/components/profile/EditProfileModal.tsx'
import { useState } from 'react'
import { getInitials } from '#/lib/utils.ts'
import { AvailabilityCalendar } from "#/components/profile/AvailabilityCalendar.tsx";
import { useAvailabilitySlots } from "#/lib/queries/ProfileTimeSlotQueries.ts";
import { useMentorReviews } from '#/lib/queries/ProfileQueries.ts'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
interface BaseMappedProfile {
  full_name: string
  bio: string
  hidden: boolean
  picture_url: string
  skills: string[]
  username: string,
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
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
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
        return <p className="text-sm text-gray-500 italic">No public reviews yet.</p>
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
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Muted className="text-xs">{page} / {totalPages}</Muted>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="h-7 px-2"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}

function HiddenField({ label }: { label: string }) {
  return (
      <div className="flex items-center gap-2 text-ink-soft text-sm italic">
        <EyeOff className="h-4 w-4" />
        {label} is hidden by the user.
      </div>
  )
}

import { ReportUserDialog } from '#/components/ReportUserDialog.tsx'

export function ProfilePageView({ profile, isOwner, isAuthenticatedViewer }: ProfilePageViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const isHidden = profile.hidden && !isOwner
  const { data: slots = [] } = useAvailabilitySlots(profile.username, profile.isMentor)

  const avatarBlock = (
      <div className="flex flex-wrap items-center gap-5">
        {profile.picture_url && !isHidden ? (
            <img
                src={profile.picture_url}
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
              {profile.isMentor ? 'Mentor' : 'Mentee'}
            </Badge>
            {isHidden && <Badge variant="secondary">Private</Badge>}
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

          {profile.isMentor && (
              isHidden
                  ? <HiddenField label="Title" />
                  : profile.title && <Body className="text-ink-soft">{profile.title}</Body>
          )}
        </div>
      </div>
  )

  const bioCard = (
      <Card className="border-line bg-white/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Bio</CardTitle>
        </CardHeader>
        <CardContent>
          {isHidden
              ? <HiddenField label="Bio" />
              : <Body className="text-ink-soft leading-7">{profile.bio || 'No bio yet.'}</Body>
          }
        </CardContent>
      </Card>
  )

  const editModal = editOpen && (
      <EditProfileModal
          mode={profile.isMentor ? 'MENTOR' : 'MENTEE'}
          initialValues={{
            bio: profile.bio ?? '',
            title: profile.isMentor ? profile.title : undefined,
            hidden: profile.hidden,
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
                <Card className="border-line bg-white/70 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Eager to Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isHidden ? (
                        <HiddenField label="Learning interests" />
                    ) : profile.skills.length === 0 ? (
                        <p className="text-gray-500 italic">No skills listed</p>
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
          {editModal}
        </main>
    )
  }
  const openSlots = slots.filter(s => !s.is_booked)

    // MENTOR layout — restructure to put calendar full width below
    return (
        <main className="page-wrap py-10 sm:py-12 rise-in">
            <section id="availability" className="island-shell rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8">

                {/* Top 2-col grid: left content + right snapshot */}
                <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        {avatarBlock}
                        {bioCard}
                        <Card className="border-line bg-white/70 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Expertise</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isHidden ? (
                                    <HiddenField label="Expertise" />
                                ) : profile.skills.length === 0 ? (
                                    <p className="text-gray-500 italic">No skills listed</p>
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

                        {!isHidden && (
                            <Card className="border-line bg-white/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Star className="h-4 w-4 text-amber-500" />
                                        Reviews
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MentorReviewsList username={profile.username} />
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <Card className="border-line bg-white/80 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                                    <Muted className="text-xs uppercase tracking-wider">Average Rating</Muted>
                                    {isHidden ? (
                                        <HiddenField label="Rating" />
                                    ) : (
                                        <p className="text-2xl font-semibold text-ink mt-1 flex items-center gap-1">
                                            <Star className="h-4 w-4 fill-current text-amber-500" />
                                            {profile.average_rating.toFixed(1)}
                                        </p>
                                    )}
                                </div>
                                <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                                    <Muted className="text-xs uppercase tracking-wider">Total Mentees</Muted>
                                    {isHidden ? (
                                        <HiddenField label="Mentee count" />
                                    ) : (
                                        <p className="text-2xl font-semibold text-ink mt-1">{profile.total_mentee_count}</p>
                                    )}
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
                {!isHidden && (
                    <AvailabilityCalendar
                        username={profile.username}
                        isOwner={isOwner}
                        isAuthenticated={isAuthenticatedViewer}
                    />
                )}

            </section>
            {editModal}
        </main>
    )
}