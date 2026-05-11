import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
    useCreateWorkshopMutation,
    useUpdateWorkshopMutation,
    type CommunityWorkshop,
} from '@/lib/queries/WorkshopQueries.ts'

interface CreateWorkshopDialogProps {
    tagId: string
    open: boolean
    onClose: () => void
    editWorkshop?: CommunityWorkshop | null
}

function toLocalDatetimeValue(isoString: string): string {
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateWorkshopDialog({ tagId, open, onClose, editWorkshop }: CreateWorkshopDialogProps) {
    const isEdit = Boolean(editWorkshop)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [scheduledAt, setScheduledAt] = useState('')
    const [endAt, setEndAt] = useState('')
    const [maxParticipants, setMaxParticipants] = useState(10)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (editWorkshop) {
            setTitle(editWorkshop.title)
            setDescription(editWorkshop.description ?? '')
            setScheduledAt(toLocalDatetimeValue(editWorkshop.scheduled_at))
            setEndAt(toLocalDatetimeValue(editWorkshop.end_at))
            setMaxParticipants(editWorkshop.max_participants)
        } else {
            setTitle('')
            setDescription('')
            setScheduledAt('')
            setEndAt('')
            setMaxParticipants(10)
        }
        setError(null)
    }, [editWorkshop, open])

    const createMutation = useCreateWorkshopMutation(tagId)
    const updateMutation = useUpdateWorkshopMutation(tagId, editWorkshop?.id ?? '')

    const isPending = createMutation.isPending || updateMutation.isPending

    function validate(): string | null {
        if (!title.trim()) return 'Title is required.'
        if (!scheduledAt) return 'Start date/time is required.'
        if (!endAt) return 'End date/time is required.'
        const start = new Date(scheduledAt)
        const end = new Date(endAt)
        if (end <= start) return 'End time must be after start time.'
        if (!isEdit && start < new Date(Date.now() + 60 * 60 * 1000)) {
            return 'Workshop must be scheduled at least 1 hour from now.'
        }
        if (maxParticipants < 1) return 'Capacity must be at least 1.'
        return null
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const validationError = validate()
        if (validationError) { setError(validationError); return }
        setError(null)

        const payload = {
            title: title.trim(),
            description: description.trim() || undefined,
            scheduled_at: new Date(scheduledAt).toISOString(),
            end_at: new Date(endAt).toISOString(),
            max_participants: maxParticipants,
        }

        try {
            if (isEdit) {
                await updateMutation.mutateAsync(payload)
                toast.success('Workshop updated.')
            } else {
                await createMutation.mutateAsync(payload)
                toast.success('Workshop created!')
            }
            onClose()
        } catch {
            toast.error(`Failed to ${isEdit ? 'update' : 'create'} workshop. Please try again.`)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Workshop' : 'Create Workshop'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ws_title">Title <span className="text-red-500">*</span></Label>
                        <input
                            id="ws_title"
                            className="border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Workshop title"
                            maxLength={200}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ws_desc">Description</Label>
                        <Textarea
                            id="ws_desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What will participants learn?"
                            maxLength={2000}
                            rows={3}
                        />
                        <p className="text-xs text-ink-soft text-right">{description.length}/2000</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="ws_start">Start <span className="text-red-500">*</span></Label>
                            <input
                                id="ws_start"
                                type="datetime-local"
                                className="border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="ws_end">End <span className="text-red-500">*</span></Label>
                            <input
                                id="ws_end"
                                type="datetime-local"
                                className="border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                                value={endAt}
                                onChange={e => setEndAt(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ws_capacity">Max Participants <span className="text-red-500">*</span></Label>
                        <input
                            id="ws_capacity"
                            type="number"
                            min={1}
                            className="border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 w-32"
                            value={maxParticipants}
                            onChange={e => setMaxParticipants(Number(e.target.value))}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                        <Button type="submit" disabled={isPending} className="bg-accent hover:bg-accent/90 text-white">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Create Workshop'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}