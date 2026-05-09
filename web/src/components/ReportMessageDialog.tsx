import { useState } from 'react'
import { useSubmitReport } from '#/lib/queries/AdminQueries.ts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReportMessageDialogProps {
  messageId: string
  reportedUsername: string
  trigger?: React.ReactNode
}

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
  { value: 'OTHER', label: 'Other' },
]

export function ReportMessageDialog({ messageId, reportedUsername, trigger }: ReportMessageDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const submitReport = useSubmitReport()

  const handleSubmit = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (!reason) {
      toast.error('Please select a reason')
      return
    }
    submitReport.mutate(
      { reportedUsername, reason, description, relatedMessageId: messageId },
      {
        onSuccess: () => {
          toast.success('Report submitted', {
            description: 'Your report has been submitted. Our moderation team will review it.',
          })
          setOpen(false)
          setReason('')
          setDescription('')
        },
        onError: (err) => {
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-ink-soft hover:text-red-600 transition-colors"
            title="Report Message"
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="sr-only">Report Message</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Message</DialogTitle>
          <DialogDescription>
            Flag this message from @{reportedUsername} for review.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-xs uppercase tracking-wider font-bold text-ink-soft mb-2 block">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-bold text-ink-soft mb-2 block">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-y min-h-20"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitReport.isPending || !reason}
          >
            {submitReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Flag className="w-4 h-4 mr-1.5" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
