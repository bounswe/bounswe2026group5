import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Muted } from '@/components/Typography'
import { SkillPicker } from '@/components/SkillPicker'

// ── Types ─────────────────────────────────────────────────────────

type Skill = { name: string }

export interface EditProfileValues {
    bio: string
    skills: Skill[]
}

interface EditProfileModalProps {
    mode: 'MENTOR' | 'MENTEE' | 'BOTH'
    initialValues: EditProfileValues
    onClose: () => void
    onSave: (values: EditProfileValues) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────

export function EditProfileModal({
                                     mode,
                                     initialValues,
                                     onClose,
                                     onSave,
                                 }: EditProfileModalProps) {
    const [bio, setBio] = useState(initialValues.bio)
    const [skills, setSkills] = useState<Skill[]>(initialValues.skills)
    const [isSaving, setIsSaving] = useState(false)

    const isMentee = mode === 'MENTEE'

    const title = isMentee ? 'Edit Your Profile' : 'Edit Mentor Profile'
    const subtitle = isMentee
        ? 'Tell the community about yourself and what you want to learn.'
        : 'Update your bio and the skills you can mentor others in.'
    const skillsLabel = isMentee ? 'Eager to Learn' : 'Expertise'
    const skillsHint = isMentee
        ? 'Pick the topics you want to explore.'
        : 'Pick the skills you can teach or guide others through.'

    async function handleSave() {
        setIsSaving(true)
        try {
            await onSave({ bio, skills })
            onClose()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg rounded-3xl island-shell shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line shrink-0">
                    <div>
                        <h2 id="edit-modal-title" className="text-xl font-semibold text-ink leading-tight">
                            {title}
                        </h2>
                        <Muted className="text-sm mt-0.5">{subtitle}</Muted>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-1.5 hover:bg-accent-muted transition-colors text-ink-soft hover:text-ink"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Bio */}
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium text-ink">
                            Bio
                        </Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Write a short intro about yourself..."
                            className="bg-background resize-none min-h-[110px]"
                            maxLength={500}
                        />
                        <Muted className="text-xs text-right">{bio.length} / 500</Muted>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-ink">{skillsLabel}</Label>
                        <Muted className="text-xs block">{skillsHint}</Muted>
                        <SkillPicker selected={skills} onChange={setSkills} />
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[90px]"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                </div>

            </div>
        </div>
    )
}