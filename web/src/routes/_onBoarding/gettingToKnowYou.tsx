import {createFileRoute, Link} from '@tanstack/react-router'
import { useState } from 'react'
import { Heading, Subheading, Muted } from "#/components/Typography.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Button } from "#/components/ui/button.tsx"
import { SkillPicker } from "#/components/SkillPicker.tsx"

export const Route = createFileRoute('/_onBoarding/gettingToKnowYou')({
    component: RouteComponent,
})

type Skill = { name: string }

type UserAnswers = {
    username: string
    primaryUsage: 'mentee' | 'mentor' | ''
    learnSkills: Skill[]
    teachSkills: Skill[]
}

type Question = {
    key: keyof UserAnswers
    question: string
    clarification: string
    mutedText?: string
    type: 'text' | 'choice' | 'skills'
    skillsKey?: 'learnSkills' | 'teachSkills'
    validate: (answers: UserAnswers) => string | null
}

const BASE_QUESTIONS: Question[] = [
    {
        key: 'username',
        question: "What should we call you?",
        clarification: "Pick a username. It's how other users will find you.",
        type: 'text',
        validate: ({ username }) =>
            username.trim().length < 3 ? "Username must be at least 3 characters." : null,
    },
    {
        key: 'primaryUsage',
        question: "How will you use Campus Tutor Primarily?",
        clarification: "This helps us personalize your experience. ",
        mutedText: "Selecting mentor does not disable your use of the app as mentee, and vice versa.",
        type: 'choice',
        validate: ({ primaryUsage }) =>
            !primaryUsage ? "Please select an option." : null,
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
    if (primaryUsage === 'mentee') return [...BASE_QUESTIONS, ...MENTEE_QUESTIONS]
    return [...BASE_QUESTIONS, ...MENTEE_QUESTIONS]
}

function RouteComponent() {
    const [activeIndex, setActiveIndex] = useState(0)
    const [answers, setAnswers] = useState<UserAnswers>({
        username: '',
        primaryUsage: '',
        learnSkills: [],
        teachSkills: [],
    })
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const questions = getQuestions(answers.primaryUsage)
    const current = questions[activeIndex]

    const handleNext = () => {
        const validationError = current.validate(answers)
        if (validationError) {
            setError(validationError)
            return
        }
        setError(null)

        // When advancing past the choice question, re-derive the list
        // so the progress bar immediately reflects the correct total
        if (activeIndex < questions.length - 1) {
            setActiveIndex(i => i + 1)
        } else {
            setDone(true)
        }
    }

    const handleBack = () => {
        setError(null)
        setActiveIndex(i => i - 1)
    }

    if (done) {
        return (
            <div className="min-h-screen page-wrap flex flex-col gap-4 mt-10 items-center">
                <Heading as="h1" className="text-4xl font-extralight">
                    You're all set, {answers.username}! 
                </Heading>
                <Subheading>Your profile has been saved.</Subheading>

                <Link to="/dashboard" replace={true}>Go To Dashboard. (To be changed by api wait, and automatic redirection</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen page-wrap flex flex-col items-center">
            <div className="island-shell rounded-2xl px-10 py-10 rise-in w-full max-w-xl flex flex-col gap-6 mt-10">

                {/* Progress bar — length updates once primaryUsage is chosen */}
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

                {/* Question text */}
                <div className="flex flex-col gap-1">
                    <Heading as="h1" className="text-4xl font-extralight">
                        {current.question}
                    </Heading>
                    <Subheading>{current.clarification}</Subheading>
                    {current.mutedText && (
                        <Muted>{current.mutedText}</Muted>
                    )}
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

                    {current.type === 'choice' && (
                        <div className="flex gap-3">
                            {(['mentee', 'mentor'] as const).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setAnswers(prev => ({ ...prev, primaryUsage: option }))}
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
                            onChange={skills =>
                                setAnswers(prev => ({ ...prev, [current.skillsKey!]: skills }))
                            }
                        />
                    )}

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between pt-2">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={activeIndex === 0}
                        className="text-muted-foreground"
                    >
                        ← Back
                    </Button>
                    <Button className="px-8" onClick={handleNext}>
                        {activeIndex < questions.length - 1 ? 'Continue →' : 'Finish'}
                    </Button>
                </div>

            </div>
        </div>
    )
}