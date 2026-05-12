// web/src/components/ReportUserDialog.tsx
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

interface ReportUserDialogProps {
  reportedUsername: string
}

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' },
  { value: 'OTHER', label: 'Other' },
]

export function ReportUserDialog({ reportedUsername }: ReportUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const submitReport = useSubmitReport()

  const handleSubmit = () => {
    if (!reason) {
      toast.error('Please select a reason')
      return
    }
    submitReport.mutate(
      { reportedUsername, reason, description },
      {
        onSuccess: () => {
          toast.success('Report submitted', {
            description: 'Thank you for helping keep our community safe.',
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
        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          <Flag className="w-3.5 h-3.5 mr-1.5" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {reportedUsername}</DialogTitle>
          <DialogDescription>
            Help us understand what's wrong. Your report will be reviewed by our moderation team.
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
