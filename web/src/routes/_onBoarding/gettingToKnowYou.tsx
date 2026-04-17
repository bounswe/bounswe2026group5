import { SkillPicker } from "#/components/SkillPicker.tsx"
import { Heading, Muted, Subheading } from "#/components/Typography.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { meQueryOptions, useUpdateAppUsageMode } from "#/lib/queries/AuthQueries.ts"
import { useUpdateProfile } from "#/lib/queries/ProfileQueries.ts"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

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
}

type Question = {
    key: keyof UserAnswers
    question: string
    clarification: string
    mutedText?: string
    type: 'text' | 'textarea' | 'choice' | 'skills'
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
        validate: ({ firstName }) =>
            firstName.trim().length < 2 ? "First name must be at least 2 characters." : null,
    },
    {
        key: 'lastName',
        question: "What's your last name?",
        clarification: "This will appear on your profile.",
        type: 'text',
        validate: ({ lastName }) =>
            lastName.trim().length < 2 ? "Last name must be at least 2 characters." : null,
    },
    {
        key: 'primaryUsage',
        question: "How will you use Campus Tutor ?",
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

function getQuestions(primaryUsage: UserAnswers['primaryUsage']): Question[] {
    if (primaryUsage === 'mentor') return [...BASE_QUESTIONS, ...MENTOR_QUESTIONS]
    return [...BASE_QUESTIONS, ...MENTEE_QUESTIONS]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RouteComponent() {
    const router = useRouter()
    const { data: me } = useQuery(meQueryOptions)
    const queryClient = useQueryClient();

    const [activeIndex, setActiveIndex] = useState(0)
    const [answers, setAnswers] = useState<UserAnswers>({
        firstName: '',
        lastName: '',
        primaryUsage: '',
        bio: '',
        learnSkills: [],
        teachSkills: [],
    })
    const [error, setError] = useState<string | null>(null)

    const questions = getQuestions(answers.primaryUsage)
    const current = questions[activeIndex]

    const updateUsageMode = useUpdateAppUsageMode()
    const updateProfile = useUpdateProfile()

    const isSubmitting = updateUsageMode.isPending || updateProfile.isPending
    const submitError = updateUsageMode.error?.message || updateProfile.error?.message

    const handleFinish = () => {
        if (!me?.username) return

        const skills = answers.primaryUsage === 'mentor'
            ? answers.teachSkills
            : answers.learnSkills

        updateUsageMode.mutate(
            {
                app_usage_mode: answers.primaryUsage.toUpperCase() as 'MENTEE' | 'MENTOR',
            },
            {
                onSuccess: () => {
                    updateProfile.mutate(
                        {
                            display_name: `${answers.firstName} ${answers.lastName}`.trim(),
                            bio: answers.bio,
                            skills: skills,
                        },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['me'] })
                                router.navigate({ to: '/dashboard' })
                            },
                        }
                    )
                },
            }
        )
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

                    {current.type === 'skills' && current.skillsKey && (
                        <SkillPicker
                            selected={answers[current.skillsKey]}
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
                        disabled={activeIndex === 0 || isSubmitting}
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