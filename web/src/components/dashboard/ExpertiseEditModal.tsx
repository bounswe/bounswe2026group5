// web/src/components/dashboard/ExpertiseEditModal.tsx
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { useState } from 'react'

interface ExpertiseSkill {
  id: string
  name: string
  category: string
  description: string
}

interface ExpertiseEditModalProps {
  initialSkills?: ExpertiseSkill[]
}

export function ExpertiseEditModal({ initialSkills = [] }: Readonly<ExpertiseEditModalProps>) {
  const [isOpen, setIsOpen] = useState(false)

  const [skills, setSkills] = useState<ExpertiseSkill[]>(initialSkills)
  const [newSkillText, setNewSkillText] = useState('')

  const handleRemoveSkill = (idToRemove: string) => {
    setSkills(skills.filter(skill => skill.id !== idToRemove))
  }

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkillText.trim()) return

    // FIX: Added the missing 'description' property to satisfy the MockExpertise type
    const newSkill = {
      id: `temp-${Date.now()}`,
      name: newSkillText.trim(),
      category: 'Added',
      description: 'Custom skill added by user', // <-- This fixes the error!
    }
    
    setSkills([...skills, newSkill])
    setNewSkillText('')
  }

  const handleSave = () => {
    // FUTURE: Trigger TanStack Query mutation to update profile skills on the backend
    console.log('Saving updated skills:', skills)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-accent text-xs font-semibold hover:bg-accent/10">
          Edit Skills
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] island-shell border-line">
        <DialogHeader>
          <DialogTitle>Edit Skills</DialogTitle>
          <DialogDescription>
            Add or remove skills from your profile to help mentees find you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          
          {/* Current Skills List */}
          <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-black/[0.02] rounded-lg border border-line">
            {skills.length === 0 ? (
              <span className="text-sm text-ink-soft italic">No skills listed yet.</span>
            ) : (
              skills.map(skill => (
                <Badge key={skill.id} variant="secondary" className="bg-white border-line text-ink gap-1 pr-1 shadow-sm">
                  {skill.name}
                  <button
                    onClick={() => handleRemoveSkill(skill.id)}
                    className="ml-1 rounded-full hover:bg-accent/20 hover:text-accent transition-colors p-0.5"
                  >
                    <X className="w-3 h-3" />
                    <span className="sr-only">Remove {skill.name}</span>
                  </button>
                </Badge>
              ))
            )}
          </div>

          {/* Add New Skill Input */}
          <form onSubmit={handleAddSkill} className="flex gap-2">
            {/* FUTURE: Upgrade this Input to a Shadcn <Command> combobox for searching a predefined database of skills */}
            <Input 
              placeholder="e.g. System Design..." 
              value={newSkillText}
              onChange={(e) => setNewSkillText(e.target.value)}
              className="border-line"
            />
            <Button type="submit" variant="secondary" className="shrink-0 border border-line bg-white hover:bg-black/[0.02]">
              Add
            </Button>
          </form>
          
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-line text-ink-soft">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-white">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}