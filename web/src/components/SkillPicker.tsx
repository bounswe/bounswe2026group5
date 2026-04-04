import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from "#/components/ui/input.tsx"
import { skillsQueryOptions } from "#/lib/queries/ProfileQueries.ts"

type SkillPickerProps = {
    selected: string[]
    onChange: (skills: string[]) => void
    mode?: 'mentor' | 'mentee'
}

export function SkillPicker({ selected, onChange, mode = 'mentee' }: SkillPickerProps) {
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

    const selectedStyle = mode === 'mentor'
        ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'

    const hoverStyle = mode === 'mentor'
        ? 'hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
        : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'

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
                                    ? selectedStyle
                                    : `bg-background text-foreground border-border ${hoverStyle}`
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