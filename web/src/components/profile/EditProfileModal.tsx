import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { useOwnProfile, useUpdateProfile, useUploadProfilePicture } from '#/lib/queries/ProfileQueries.ts'
import { SkillPicker } from '@/components/SkillPicker'
import { Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getAbsoluteMediaUrl } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────


export interface EditProfileValues {
    bio: string
    skills: string[]
}

interface EditProfileModalProps {
    mode: 'MENTOR' | 'MENTEE'
    initialValues: EditProfileValues & {
        title?: string
        show_initials_only?: boolean
    }
    onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────

export function EditProfileModal({ mode, initialValues, onClose }: EditProfileModalProps) {
    const { data: me } = useQuery(meQueryOptions)
    const { data: profileData } = useOwnProfile()
    const updateProfile = useUpdateProfile()
    const uploadPicture = useUploadProfilePicture()
    const queryClient = useQueryClient()
    const pictureInputRef = useRef<HTMLInputElement>(null)

    const [bio, setBio] = useState(initialValues.bio)
    const [skills, setSkills] = useState<string[]>(initialValues.skills)
    const [title, setTitle] = useState(initialValues.title ?? '')
    const [showInitialsOnly, setShowInitialsOnly] = useState(initialValues.show_initials_only ?? false)
    const [errors, setErrors] = useState<{ title?: string; bio?: string }>({})

    function handlePictureChange(file: File) {
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB')
            return
        }
        uploadPicture.mutate(file, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] })
                queryClient.invalidateQueries({ queryKey: ['profiles', me?.username] })
            },
            onError: () => toast.error('Failed to upload picture. Please try again.'),
        })
    }

    const isMentor = mode === 'MENTOR'

    const modalTitle = isMentor ? 'Edit Mentor Profile' : 'Edit Your Profile'
    const subtitle = isMentor
        ? 'Update your bio and the skills you can mentor others in.'
        : 'Tell the community about yourself and what you want to learn.'
    const skillsLabel = isMentor ? 'Expertise' : 'Eager to Learn'
    const skillsHint = isMentor
        ? 'Pick the skills you can teach or guide others through.'
        : 'Pick the topics you want to explore.'

    const validate = () => {
        const next: { title?: string; bio?: string } = {}
        if (isMentor && title.trim().length > 100)
            next.title = "Title must be 100 characters or fewer."
        else if (isMentor && title.trim().length > 0 && !/^[a-zA-ZÀ-ÿ\s',-]+$/.test(title.trim()))
            next.title = "Title can only contain letters."
        if (bio.trim().length < 10)
            next.bio = "Bio must be at least 10 characters."
        setErrors(next)
        return Object.keys(next).length === 0
    }

    const handleSave = () => {
        if (!validate()) return
        updateProfile.mutate(
            {
                bio,
                title: isMentor ? title : undefined,
                show_initials_only: showInitialsOnly,
                skills: skills,
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['profiles'] })
                    onClose()
                },
            }
        )
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg rounded-3xl island-shell shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line shrink-0">
                    <div>
                        <h2 id="edit-modal-title" className="text-xl font-semibold text-ink leading-tight">
                            {modalTitle}
                        </h2>
                        <Muted className="text-sm mt-0.5">{subtitle}</Muted>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Profile picture */}
                    <div className="flex flex-col items-center gap-2">
                        <input
                            ref={pictureInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePictureChange(f) }}
                        />
                        <button
                            type="button"
                            onClick={() => pictureInputRef.current?.click()}
                            className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
                            aria-label="Change profile picture"
                        >
                            {profileData?.picture_url ? (
                                <img
                                    src={getAbsoluteMediaUrl(profileData.picture_url)}
                                    alt="Profile"
                                    className="h-20 w-20 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-accent text-white text-2xl font-bold flex items-center justify-center">
                                    {me?.username?.[0]?.toUpperCase() ?? '?'}
                                </div>
                            )}
                            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" aria-hidden="true">
                                {uploadPicture.isPending
                                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    : <Camera className="h-6 w-6 text-white" />
                                }
                            </span>
                        </button>
                        <Muted className="text-xs">Click to change photo</Muted>
                    </div>

                    {/* Title — mentor only */}
                    {isMentor && (
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-medium text-ink">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })) }}
                                placeholder="e.g. Senior Software Engineer at Acme"
                                className="bg-background"
                                aria-invalid={!!errors.title}
                            />
                            {errors.title && <p className="text-xs text-destructive" role="alert">{errors.title}</p>}
                        </div>
                    )}

                    {/* Bio */}
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium text-ink">
                            Bio
                        </Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => { setBio(e.target.value); setErrors(p => ({ ...p, bio: undefined })) }}
                            placeholder="Write a short intro about yourself..."
                            className="bg-background resize-none min-h-[110px]"
                            maxLength={500}
                            aria-invalid={!!errors.bio}
                        />
                        <div className="flex justify-between items-center">
                            {errors.bio
                                ? <p className="text-xs text-destructive" role="alert">{errors.bio}</p>
                                : <span />
                            }
                            <Muted className="text-xs">{bio.length} / 500</Muted>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-ink">{skillsLabel}</Label>
                        <Muted className="text-xs block">{skillsHint}</Muted>
                        <SkillPicker
                            selected={skills}
                            available={profileData?.available_catalog_skills ?? []}
                            onChange={setSkills}
                            mode={isMentor ? 'mentor' : 'mentee'}
                        />
                    </div>

                    {/* Show initials only toggle */}
                    <div className="flex items-center gap-4 rounded-xl border border-line p-4 bg-black/[0.02]">
                        <Switch
                            id="show-initials-toggle"
                            checked={showInitialsOnly}
                            onCheckedChange={setShowInitialsOnly}
                        />
                        <div>
                            <label htmlFor="show-initials-toggle" className="text-sm font-medium text-ink cursor-pointer">Show initials only</label>
                            <Muted className="text-xs">Your full name and picture will be hidden from others.</Muted>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={updateProfile.isPending}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[90px]"
                        onClick={handleSave}
                        disabled={updateProfile.isPending}
                        aria-busy={updateProfile.isPending}
                    >
                        {updateProfile.isPending
                            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span className="sr-only">Saving…</span></>
                            : 'Save'}
                    </Button>
                </div>

            </div>
        </div>,
        document.body
    )
}