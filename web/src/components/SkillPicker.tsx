import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from "#/components/ui/input.tsx"
import { skillsQueryOptions } from "#/lib/queries/ProfileQueries.ts"

type SkillPickerProps = {
    selected: string[]
    onChange: (skills: string[]) => void
}

export function SkillPicker({ selected, onChange }: SkillPickerProps) {
    const [filter, setFilter] = useState('')
    const { data: skills = [], isLoading } = useQuery(skillsQueryOptions)

    const filtered = skills.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase())
    )

    const isSelected = (skillName: string) => selected.includes(skillName)

    const toggle = (skillName: string) => {
        if (isSelected(skillName)) {
            onChange(selected.filter(s => s !== skillName))
        } else {
            onChange([...selected, skillName])
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <Input
                className="bg-background"
                placeholder="Filter skills..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
            />
            <div className="island-shell rounded-xl p-4 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                {isLoading ? (
                    <p className="text-muted-foreground text-sm">Loading skills...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No skills match your filter.</p>
                ) : (
                    filtered.map(skill => (
                        <button
                            key={skill.name}
                            onClick={() => toggle(skill.name)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                                isSelected(skill.name)
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-border hover:border-primary/60 hover:text-primary'
                            }`}
                        >
                            {skill.name}
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}