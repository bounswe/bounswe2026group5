import { useState } from 'react'
import { Input } from "#/components/ui/input.tsx"

type SkillPickerProps = {
    selected: string[]
    available: string[]
    onChange: (skills: string[]) => void
    mode?: 'mentor' | 'mentee'
}

export function SkillPicker({ selected, available = [], onChange, mode = 'mentee' }: SkillPickerProps) {
    const [filter, setFilter] = useState('')

    const filtered = available.filter(s =>
        s.toLowerCase().includes(filter.toLowerCase())
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
                {available.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Loading skills...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No skills match your filter.</p>
                ) : (
                    filtered.map(skill => (
                        <button
                            key={skill}
                            onClick={() => toggle(skill)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                                isSelected(skill)
                                    ? selectedStyle
                                    : `bg-background text-foreground border-border ${hoverStyle}`
                            }`}
                        >
                            {skill}
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}