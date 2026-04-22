import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { useMatchFeedback, useSubmitFeedback } from '#/lib/queries/MentorshipQueries.ts'
import { Body, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface RatingModalProps {
    matchId: string
    mentorName: string
    onClose: () => void
    onSuccess?: () => void
}

export function RatingModal({ matchId, mentorName, onClose, onSuccess }: RatingModalProps) {
    const { data: me } = useQuery(meQueryOptions)
    const { data: feedbacks, isLoading: feedbackLoading } = useMatchFeedback(matchId)
    const { mutate: submit, isPending } = useSubmitFeedback()

    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [reviewText, setReviewText] = useState('')

    const existingFeedback = feedbacks?.find(
        f => f.submitted_by.username === me?.username,
    )

    const handleSubmit = () => {
        submit(
            { matchId, data: { rating, text: reviewText } },
            {
                onSuccess: () => {
                    toast.success('Rating submitted!')
                    onSuccess?.()
                    onClose()
                },
                onError: () => {
                    toast.error('Failed to submit rating. Please try again.')
                },
            },
        )
    }

    return (
        <Dialog open onOpenChange={open => { if (!open) onClose() }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rate your session with {mentorName}</DialogTitle>
                </DialogHeader>

                {feedbackLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                ) : existingFeedback ? (
                    <div className="py-4 space-y-3">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star
                                    key={n}
                                    className={`h-6 w-6 ${n <= existingFeedback.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                                />
                            ))}
                        </div>
                        <Body className="text-ink-soft">
                            You have already rated this mentorship.
                        </Body>
                        {existingFeedback.text && (
                            <p className="text-sm text-ink-soft italic">"{existingFeedback.text}"</p>
                        )}
                        <Button variant="outline" className="w-full mt-2" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <div className="py-2 space-y-5">
                        <div className="space-y-2">
                            <Muted className="text-xs uppercase tracking-wider">Your rating</Muted>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRating(n)}
                                        onMouseEnter={() => setHover(n)}
                                        onMouseLeave={() => setHover(0)}
                                        className="p-0.5 transition-transform hover:scale-110"
                                        aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                                    >
                                        <Star
                                            className={`h-8 w-8 transition-colors ${
                                                n <= (hover || rating)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <Muted className="text-xs">
                                    {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
                                </Muted>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Muted className="text-xs uppercase tracking-wider">
                                Review{' '}
                                <span className="normal-case text-amber-600">(shown on profile only if filled in)</span>
                            </Muted>
                            <Textarea
                                placeholder="Share your experience with this mentor..."
                                value={reviewText}
                                onChange={e => setReviewText(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={onClose}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={rating === 0 || isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    'Submit Rating'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
