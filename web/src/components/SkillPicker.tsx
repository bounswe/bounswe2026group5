import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from "#/components/ui/input.tsx"
import { skillsQueryOptions } from "#/lib/queries/ProfileQueries.ts"

type Skill = { name: string }

type SkillPickerProps = {
    selected: Skill[]
    onChange: (skills: Skill[]) => void
}

export function SkillPicker({ selected, onChange }: SkillPickerProps) {
    const [filter, setFilter] = useState('')
    const { data: skills = [], isLoading } = useQuery(skillsQueryOptions)

    const filtered = skills.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase())
    )

    const isSelected = (skill: Skill) => selected.some(s => s.name === skill.name)

    const toggle = (skill: Skill) => {
        if (isSelected(skill)) {
            onChange(selected.filter(s => s.name !== skill.name))
        } else {
            onChange([...selected, skill])
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
                            onClick={() => toggle(skill)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                                isSelected(skill)
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