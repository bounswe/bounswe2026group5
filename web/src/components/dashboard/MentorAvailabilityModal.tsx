// web/src/components/dashboard/MentorAvailabilityModal.tsx
import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Clock } from 'lucide-react'

export function MentorAvailabilityModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for the form. 
  // FUTURE: Replace with react-hook-form and Zod validation
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('60')

  const handleSave = () => {
    // FUTURE: This will trigger a TanStack Query mutation to the Django API 
    // to create an AvailabilitySlot record.
    console.log('Saving slot:', { date, startTime, duration })
    
    // Reset and close
    setIsOpen(false)
    setDate('')
    setStartTime('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Set Availability
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] island-shell border-line">
        <DialogHeader>
          <DialogTitle>Add Availability Slot</DialogTitle>
          <DialogDescription>
            Choose a date and time when you are available to host a mentorship session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            {/* FUTURE: Replace native date picker with Shadcn Calendar/Popover for better UI */}
            <Input 
              id="date" 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-line"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="time">Start Time</Label>
              <div className="relative">
                <Input 
                  id="time" 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border-line pl-9"
                />
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-line">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-line text-ink-soft">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-white">
            Save Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}