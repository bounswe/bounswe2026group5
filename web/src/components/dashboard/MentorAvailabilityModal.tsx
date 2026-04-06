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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]) // Defaults to Today
  const [startTime, setStartTime] = useState('09:00') // Defaults to 9 AM
  const [endTime, setEndTime] = useState('10:00')     // Defaults to 10 AM

  const handleSave = () => {
    // FUTURE: This will trigger a TanStack Query mutation to the Django API 
    // to create an AvailabilitySlot record.
    console.log('Saving slot:', { date, startTime, endTime })
    
    // Reset and close
    setIsOpen(false)
    setDate(new Date().toISOString().split('T')[0])
    setStartTime('09:00')
    setEndTime('10:00')
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
              min={new Date().toISOString().split('T')[0]}
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
              <Label htmlFor="endTime">End Time</Label>
              <div className="relative">
                <Input 
                  id="endTime" 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border-line pl-9"
                />
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
              </div>
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