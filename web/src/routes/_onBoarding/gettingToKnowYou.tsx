import { SkillPicker } from "#/components/SkillPicker.tsx"
import { Display, Heading, Muted, Subheading } from "#/components/Typography.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Label as FormLabel } from "#/components/ui/label.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { logout, meQueryOptions, useUpdateAppUsageMode } from "#/lib/queries/AuthQueries.ts"
import { useOwnProfile, useUpdateProfile, useUpdateUsername } from "#/lib/queries/ProfileQueries.ts"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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

    const inputId = `onboarding-input-${current.key}`

    return (
        <div className="min-h-screen flex flex-col">

            {/* Brand header */}
            <header className="page-wrap py-6">
                <Display as="span" className="text-lg tracking-tight">Neighborship</Display>
            </header>

            {/* Card */}
            <div className="page-wrap flex flex-col items-center pt-8 pb-16">
                <div className="island-shell rounded-2xl px-10 py-10 rise-in w-full max-w-xl flex flex-col gap-8">

                    {/* Progress */}
                    <div className="flex flex-col gap-2">
                        <div
                            role="progressbar"
                            aria-valuenow={activeIndex + 1}
                            aria-valuemin={1}
                            aria-valuemax={questions.length}
                            aria-label={`Step ${activeIndex + 1} of ${questions.length}`}
                            className="flex gap-1.5"
                        >
                            {questions.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                        i <= activeIndex ? 'bg-accent' : 'bg-accent-muted'
                                    }`}
                                />
                            ))}
                        </div>
                        <Muted className="text-xs tabular-nums">
                            Step {activeIndex + 1} of {questions.length}
                        </Muted>
                    </div>

                    {/* Question */}
                    <div className="flex flex-col gap-1.5">
                        <FormLabel htmlFor={inputId} className="sr-only">
                            {current.question}
                        </FormLabel>
                        <Heading as="h1" className="text-3xl font-light leading-snug">
                            {current.question}
                        </Heading>
                        <Subheading className="text-ink-soft font-normal">{current.clarification}</Subheading>
                        {current.mutedText && <Muted>{current.mutedText}</Muted>}
                    </div>

                    {/* Input area */}
                    <div className="flex flex-col gap-3">
                        {current.type === 'text' && (
                            <Input
                                id={inputId}
                                className="bg-background py-3 rounded-xl"
                                placeholder="Type here…"
                                value={answers[current.key] as string}
                                onChange={e =>
                                    setAnswers(prev => ({ ...prev, [current.key]: e.target.value }))
                                }
                                onKeyDown={e => e.key === 'Enter' && handleNext()}
                                autoFocus
                            />
                        )}

                        {current.type === 'textarea' && (
                            <Textarea
                                id={inputId}
                                className="bg-background resize-none rounded-xl"
                                placeholder="Write a short bio…"
                                rows={4}
                                value={answers.bio}
                                onChange={e =>
                                    setAnswers(prev => ({ ...prev, bio: e.target.value }))
                                }
                                autoFocus
                            />
                        )}

                        {current.type === 'choice' && (
                            <div id={inputId} role="group" aria-label={current.question} className="flex gap-3">
                                {(['mentee', 'mentor'] as const).map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        aria-pressed={answers.primaryUsage === option}
                                        onClick={() =>
                                            setAnswers(prev => ({ ...prev, primaryUsage: option }))
                                        }
                                        className={`flex-1 py-6 rounded-xl border-2 capitalize text-lg font-semibold transition-all ${
                                            answers.primaryUsage === option
                                                ? 'border-accent bg-accent text-white shadow-md'
                                                : 'border-line text-ink-soft hover:border-accent/50 hover:text-ink'
                                        }`}
                                    >
                                        {option === 'mentee' ? 'I want to learn' : 'I want to teach'}
                                        <span className="block text-sm font-normal mt-1 capitalize">
                                            {option}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {current.type === 'username' && (
                            <div className="flex flex-col gap-2">
                                <Input
                                    id={inputId}
                                    className="bg-background py-3 rounded-xl"
                                    placeholder="username"
                                    value={answers.username}
                                    onChange={e =>
                                        setAnswers(prev => ({ ...prev, username: e.target.value }))
                                    }
                                    onKeyDown={e => e.key === 'Enter' && handleNext()}
                                    autoFocus
                                    autoComplete="username"
                                />
                                <div className="flex flex-col gap-0.5 px-1">
                                    <Muted className="text-xs">Your profile URL will be:</Muted>
                                    <Muted className="text-sm font-mono text-accent-aa">
                                        neighborship.app/profiles/{answers.username || '…'}
                                    </Muted>
                                </div>
                            </div>
                        )}

                        {current.type === 'skills' && current.skillsKey && (
                            <div id={inputId}>
                                <SkillPicker
                                    selected={answers[current.skillsKey]}
                                    available={profileData?.available_catalog_skills ?? []}
                                    onChange={skills => setAnswers(prev => ({ ...prev, [current.skillsKey!]: skills }))}
                                    mode={answers.primaryUsage === 'mentor' ? 'mentor' : 'mentee'}
                                />
                            </div>
                        )}

                        {error && (
                            <p role="alert" className="text-destructive text-sm px-1">{error}</p>
                        )}
                        {submitError && (
                            <p role="alert" className="text-destructive text-sm px-1">{submitError}</p>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2 border-t border-line">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="gap-2 text-ink-soft hover:text-ink"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {activeIndex === 0 ? 'Sign out' : 'Back'}
                        </Button>
                        <Button
                            className="gap-2 px-7"
                            onClick={handleNext}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving…'
                                : activeIndex < questions.length - 1
                                    ? <>Continue <ArrowRight className="h-4 w-4" /></>
                                    : 'Finish'}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    )
}