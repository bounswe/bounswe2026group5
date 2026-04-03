import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Body, Heading, Muted } from '@/components/Typography'
import type { MockAvailabilitySlot, MockProfileDetails } from '@/lib/mocks/profiles'
import { CalendarDays, MapPin, Star, Sparkles, Pencil } from 'lucide-react'
import { EditProfileModal } from '#/components/profile/EditProfileModal.tsx'
import { useState } from 'react'

interface ProfilePageViewProps {
  profile: MockProfileDetails
  isOwner: boolean
  isAuthenticatedViewer: boolean
}

function getInitials(displayName: string): string {
  return displayName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
}

function formatSlot(slot: MockAvailabilitySlot): string {
  const start = new Date(slot.startAt)
  const end = new Date(slot.endAt)

  const day = start.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const time = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  return `${day} • ${time}`
}

export function ProfilePageView({ profile, isOwner, isAuthenticatedViewer }: ProfilePageViewProps) {
  const [editOpen, setEditOpen] = useState(false)
  const isMentee = profile.mentorshipMode === 'MENTEE'

  const averageExpertiseRating =
      profile.expertise.length > 0
          ? (
              profile.expertise.reduce((sum, item) => sum + item.averageRating, 0) /
              profile.expertise.length
          ).toFixed(1)
          : '0.0'

  const openSlots = profile.availabilitySlots.filter((slot) => !slot.isBooked)

  const avatarBlock = (
      <div className="flex flex-wrap items-center gap-5">
        {profile.pictureUrl && !profile.showInitialsOnly ? (
            <img
                src={profile.pictureUrl}
                alt={`${profile.displayName} profile picture`}
                className="h-20 w-20 rounded-2xl object-cover ring-1 ring-line"
            />
        ) : (
            <div className="h-20 w-20 rounded-2xl bg-accent text-white text-2xl font-bold flex items-center justify-center ring-1 ring-line">
              {getInitials(profile.displayName)}
            </div>
        )}

        <div className="min-w-[220px] flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Heading as="h1" className="text-3xl sm:text-4xl leading-tight">
              {profile.displayName}
            </Heading>
            <Badge className="bg-accent-muted text-ink border border-line">
              {profile.mentorshipMode}
            </Badge>
            {!profile.isVisible && (
                <Badge variant="secondary">Private</Badge>
            )}
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

          {profile.title && <Body className="text-ink-soft">{profile.title}</Body>}

          {profile.locationText && (
              <Muted className="text-sm flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {profile.locationText}
              </Muted>
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
          <Body className="text-ink-soft leading-7">
            {profile.bio || 'This user has not added a bio yet.'}
          </Body>
        </CardContent>
      </Card>
  )

  const ctaCard = (
      <Card className="border-line bg-white/80 shadow-sm">
        <CardContent className="pt-4 space-y-2">
          {isOwner ? (
              <Button className="w-full" variant="default" onClick={() => setEditOpen(true)}>
                Edit Profile
              </Button>
          ) : isAuthenticatedViewer ? (
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
          mode={profile.mentorshipMode}
          initialValues={{ bio: profile.bio ?? '', skills: profile.expertise.map(e => ({ name: e.name })) }}
          onClose={() => setEditOpen(false)}
          onSave={async (_values) => {
            // call your API here
          }}
      />
  )

  // ── MENTEE layout ──────────────────────────────────────────────
  if (isMentee) {
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
                  <CardContent className="space-y-3">
                    {profile.expertise.length === 0 && (
                        <Muted>No learning interests listed yet.</Muted>
                    )}
                    {profile.expertise.map((item) => (
                        <article key={item.id} className="rounded-xl border border-line p-4 bg-white">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-ink">{item.name}</h3>
                              <p className="text-sm text-ink-soft">{item.description}</p>
                            </div>
                            <Badge variant="secondary">Interest Level {item.proficiencyLevel}/5</Badge>
                          </div>
                        </article>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-4">
                {ctaCard}
              </aside>
            </div>
          </section>
          {editModal}
        </main>
    )
  }

  // ── MENTOR / BOTH layout ───────────────────────────────────────
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
                <CardContent className="space-y-3">
                  {profile.expertise.length === 0 && (
                      <Muted>No expertise fields are listed yet.</Muted>
                  )}
                  {profile.expertise.map((item) => (
                      <article key={item.id} className="rounded-xl border border-line p-4 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-ink">{item.name}</h3>
                            <p className="text-sm text-ink-soft">{item.description}</p>
                          </div>
                          <Badge variant="secondary">Proficiency {item.proficiencyLevel}/5</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                          <Star className="h-4 w-4 fill-current text-amber-500" />
                          {item.averageRating.toFixed(1)} average from {item.ratingCount} ratings
                        </div>
                      </article>
                  ))}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="border-line bg-white/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                    <Muted className="text-xs uppercase tracking-wider">Expertise Fields</Muted>
                    <p className="text-2xl font-semibold text-ink mt-1">{profile.expertise.length}</p>
                  </div>
                  <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                    <Muted className="text-xs uppercase tracking-wider">Average Rating</Muted>
                    <p className="text-2xl font-semibold text-ink mt-1">{averageExpertiseRating}</p>
                  </div>
                  <div className="rounded-lg bg-accent-muted/60 p-3 border border-line">
                    <Muted className="text-xs uppercase tracking-wider">Open Slots</Muted>
                    <p className="text-2xl font-semibold text-ink mt-1">{openSlots.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-line bg-white/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {openSlots.length === 0 && (
                      <Muted>No open availability slots right now.</Muted>
                  )}
                  {openSlots.slice(0, 4).map((slot) => (
                      <div key={slot.id} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-soft">
                        {formatSlot(slot)}
                      </div>
                  ))}
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