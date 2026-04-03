import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Body, Heading, Muted } from '@/components/Typography'
import { Star, Sparkles, Pencil, EyeOff } from 'lucide-react'
import { EditProfileModal } from '#/components/profile/EditProfileModal.tsx'
import { useState } from 'react'
import type { AvailabilitySlot } from '#/lib/queries/ProfileQueries.ts'
import { getInitials } from '#/lib/utils.ts'
import {AvailabilityCalendar} from "#/components/profile/AvailabilityCalendar.tsx";

interface BaseMappedProfile {
  full_name: string
  bio: string
  hidden: boolean
  picture_url: string
  expertises: string[]
  username: string,
}

interface MentorMappedProfile extends BaseMappedProfile {
  isMentor: true
  title: string
  rating: number
  total_mentee_count: number
  available_slots: AvailabilitySlot[]
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

function HiddenField({ label }: { label: string }) {
  return (
      <div className="flex items-center gap-2 text-ink-soft text-sm italic">
        <EyeOff className="h-4 w-4" />
        {label} is hidden by the user.
      </div>
  )
}

export function ProfilePageView({ profile, isOwner, isAuthenticatedViewer }: ProfilePageViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const isHidden = profile.hidden && !isOwner

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

  const ctaCard = !isOwner && (
      <Card className="border-line bg-white/80 shadow-sm">
        <CardContent className="pt-4 space-y-2">
          {isAuthenticatedViewer ? (
              <Button className="w-full bg-accent hover:bg-accent/90 text-white">
                Send Mentorship Request (Soon)
              </Button>
          ) : (
              <Button className="w-full" variant="outline">
                Login to Connect
              </Button>
          )}
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
            skills: profile.expertises,
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
                    ) : profile.expertises.length === 0 ? (
                        <Muted>No learning interests listed yet.</Muted>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                          {profile.expertises.map(skill => (
                              <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <aside className="space-y-4">{ctaCard}</aside>
            </div>
          </section>
          {editModal}
        </main>
    )
  }

  const openSlots = profile.available_slots.filter(s => !s.is_booked)

  return (
      <main className="page-wrap py-10 sm:py-12 rise-in">
        <section className="island-shell rounded-3xl p-6 sm:p-8 lg:p-10">
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
                  ) : profile.expertises.length === 0 ? (
                      <Muted>No expertise listed yet.</Muted>
                  ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.expertises.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>

                  )}
                </CardContent>

              </Card>
              {!isHidden && (
                  <AvailabilityCalendar
                      username={profile.username}
                      slots={profile.available_slots}
                      isOwner={isOwner}
                      isAuthenticated={isAuthenticatedViewer}
                  />
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
                          {profile.rating.toFixed(1)}
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

              {ctaCard}
            </aside>
          </div>
        </section>
        {editModal}
      </main>
  )
}