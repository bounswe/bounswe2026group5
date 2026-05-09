import { SkillPicker } from "#/components/SkillPicker.tsx"
import { Heading, Muted, Subheading } from "#/components/Typography.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { logout, meQueryOptions, useUpdateAppUsageMode } from "#/lib/queries/AuthQueries.ts"
import { useOwnProfile, useUpdateProfile, useUpdateUsername } from "#/lib/queries/ProfileQueries.ts"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_onBoarding/gettingToKnowYou')({
    loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions),
    component: RouteComponent,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserAnswers = {
    firstName: string
    lastName: string
    primaryUsage: 'mentee' | 'mentor' | ''
    bio: string
    learnSkills: string[]
    teachSkills: string[]
    username: string
}

type Question = {
    key: keyof UserAnswers
    question: string
    clarification: string
    mutedText?: string
    type: 'text' | 'textarea' | 'choice' | 'skills' | 'username'
    skillsKey?: 'learnSkills' | 'teachSkills'
    validate: (answers: UserAnswers) => string | null
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const BASE_QUESTIONS: Question[] = [
    {
        key: 'firstName',
        question: "What's your first name?",
        clarification: "This will appear on your profile.",
        type: 'text',
        validate: ({ firstName }) => {
            if (firstName.trim().length < 2) return "First name must be at least 2 characters."
            if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(firstName.trim())) return "First name can only contain letters."
            return null
        },
    },
    {
        key: 'lastName',
        question: "What's your last name?",
        clarification: "This will appear on your profile.",
        type: 'text',
        validate: ({ lastName }) => {
            if (lastName.trim().length < 2) return "Last name must be at least 2 characters."
            if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(lastName.trim())) return "Last name can only contain letters."
            return null
        },
    },
    {
        key: 'primaryUsage',
        question: "How will you use Neighborship ?",
        clarification: "This helps us personalize your experience.",
        type: 'choice',
        validate: ({ primaryUsage }) =>
            !primaryUsage ? "Please select an option." : null,
    },
    {
        key: 'bio',
        question: "Tell us a bit about yourself.",
        clarification: "This will be visible on your profile.",
        type: 'textarea',
        validate: ({ bio }) =>
            bio.trim().length < 10 ? "Bio must be at least 10 characters." : null,
    },
]

const MENTEE_QUESTIONS: Question[] = [
    {
        key: 'learnSkills',
        question: "What topics do you want to learn?",
        clarification: "Select at least one subject you'd like to get help with.",
        type: 'skills',
        skillsKey: 'learnSkills',
        validate: ({ learnSkills }) =>
            learnSkills.length === 0 ? "Please select at least one topic." : null,
    },
]

const MENTOR_QUESTIONS: Question[] = [
    {
        key: 'teachSkills',
        question: "What topics can you teach?",
        clarification: "Select subjects you feel confident mentoring others in.",
        type: 'skills',
        skillsKey: 'teachSkills',
        validate: ({ teachSkills }) =>
            teachSkills.length === 0 ? "Please select at least one topic." : null,
    },
]

const USERNAME_QUESTION: Question = {
    key: 'username',
    question: "Choose a username.",
    clarification: "Your username is separate from your display name and identifies your public profile.",
    type: 'username',
    validate: ({ username }) => {
        if (username.trim().length < 3) return "Username must be at least 3 characters."
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "Username can only contain letters, numbers, underscores, and hyphens."
        return null
    },
}

function getQuestions(primaryUsage: UserAnswers['primaryUsage']): Question[] {
    const skillsQuestions = primaryUsage === 'mentor' ? MENTOR_QUESTIONS : MENTEE_QUESTIONS
    return [...BASE_QUESTIONS, ...skillsQuestions, USERNAME_QUESTION]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RouteComponent() {
    const router = useRouter()
    const { data: me } = useQuery(meQueryOptions)
    const { data: profileData } = useOwnProfile()
    const queryClient = useQueryClient();

    const [activeIndex, setActiveIndex] = useState(0)
    const [answers, setAnswers] = useState<UserAnswers>({
        firstName: '',
        lastName: '',
        primaryUsage: '',
        bio: '',
        learnSkills: [],
        teachSkills: [],
        username: '',
    })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (me?.email) {
            setAnswers(prev => ({
                ...prev,
                username: prev.username || me.email.split('@')[0],
            }))
        }
    }, [me?.email])

    const questions = getQuestions(answers.primaryUsage)
    const current = questions[activeIndex]

    const updateUsageMode = useUpdateAppUsageMode()
    const updateProfile = useUpdateProfile()
    const updateUsername = useUpdateUsername()

    const [isProcessing, setIsProcessing] = useState(false)
    const isSubmitting = isProcessing || updateUsageMode.isPending || updateProfile.isPending || updateUsername.isPending
    const submitError = updateUsageMode.error?.message || updateProfile.error?.message || updateUsername.error?.message

    const handleFinish = async () => {
        if (!me) return
        setIsProcessing(true)

        const skills = answers.primaryUsage === 'mentor'
            ? answers.teachSkills
            : answers.learnSkills

        try {
            // 1. Update Usage Mode
            await updateUsageMode.mutateAsync({
                app_usage_mode: answers.primaryUsage.toUpperCase() as 'MENTEE' | 'MENTOR',
            })

            // 2. Update Profile Details
            await updateProfile.mutateAsync({
                display_name: `${answers.firstName} ${answers.lastName}`.trim(),
                bio: answers.bio,
                skills: skills,
            })

            // 3. Update Username
            await updateUsername.mutateAsync(answers.username)

            // 4. Finalize
            await queryClient.invalidateQueries({ queryKey: ['me'] })
            router.navigate({ to: '/dashboard' })
        } catch (err) {
            console.error("Onboarding submission failed:", err)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleNext = () => {
        const validationError = current.validate(answers)
        if (validationError) { setError(validationError); return }
        setError(null)

        if (activeIndex < questions.length - 1) {
            setActiveIndex(i => i + 1)
        } else {
            handleFinish()
        }
    }

    const handleBack = () => {
        setError(null)
        if (activeIndex === 0) {
            logout()
            return
        }
        setActiveIndex(i => i - 1)
    }

    return (
        <div className="min-h-screen page-wrap flex flex-col items-center">
            <div className="island-shell rounded-2xl px-10 py-10 rise-in w-full max-w-xl flex flex-col gap-6 mt-10">

                {/* Progress bar */}
                <div className="flex gap-2">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= activeIndex ? 'bg-primary' : 'bg-accent-muted'
                            }`}
                        />
                    ))}
                </div>

                {/* Question */}
                <div className="flex flex-col gap-1">
                    <Heading as="h1" className="text-4xl font-extralight">
                        {current.question}
                    </Heading>
                    <Subheading>{current.clarification}</Subheading>
                    {current.mutedText && <Muted>{current.mutedText}</Muted>}
                </div>

                {/* Input area */}
                <div className="flex flex-col gap-3">
                    {current.type === 'text' && (
                        <Input
                            className="bg-background"
                            placeholder="Type here..."
                            value={answers[current.key] as string}
                            onChange={e =>
                                setAnswers(prev => ({ ...prev, [current.key]: e.target.value }))
                            }
                            onKeyDown={e => e.key === 'Enter' && handleNext()}
                        />
                    )}

                    {current.type === 'textarea' && (
                        <Textarea
                            className="bg-background resize-none"
                            placeholder="Write a short bio..."
                            rows={4}
                            value={answers.bio}
                            onChange={e =>
                                setAnswers(prev => ({ ...prev, bio: e.target.value }))
                            }
                        />
                    )}

                    {current.type === 'choice' && (
                        <div className="flex gap-3">
                            {(['mentee', 'mentor'] as const).map(option => (
                                <button
                                    key={option}
                                    onClick={() =>
                                        setAnswers(prev => ({ ...prev, primaryUsage: option }))
                                    }
                                    className={`flex-1 py-4 rounded-xl border-2 capitalize text-lg font-medium transition-all ${
                                        answers.primaryUsage === option
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-primary/60'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {current.type === 'username' && (
                        <div className="flex flex-col gap-2">
                            <Input
                                className="bg-background"
                                placeholder="username"
                                value={answers.username}
                                onChange={e =>
                                    setAnswers(prev => ({ ...prev, username: e.target.value }))
                                }
                                onKeyDown={e => e.key === 'Enter' && handleNext()}
                            />
                            <div className="flex flex-col gap-0.5">
                                <Muted className="text-xs">Your profile URL will be:</Muted>
                                <Muted className="text-sm font-mono">
                                    https://neighborship.app/profiles/{answers.username || '...'}
                                </Muted>
                            </div>
                        </div>
                    )}

                    {current.type === 'skills' && current.skillsKey && (
                        <SkillPicker
                            selected={answers[current.skillsKey]}
                            available={profileData?.available_catalog_skills ?? []}
                            onChange={skills => setAnswers(prev => ({ ...prev, [current.skillsKey!]: skills }))}
                            mode={answers.primaryUsage === 'mentor' ? 'mentor' : 'mentee'}
                        />
                    )}

                    {error && <p className="text-destructive text-sm">{error}</p>}
                    {submitError && <p className="text-destructive text-sm">{submitError}</p>}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={isSubmitting}
                        className="text-muted-foreground"
                    >
                        ← Back
                    </Button>
                    <Button
                        className="px-8"
                        onClick={handleNext}
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? 'Saving...'
                            : activeIndex < questions.length - 1
                                ? 'Continue →'
                                : 'Finish'}
                    </Button>
                </div>

            </div>
        </div>
    )
}