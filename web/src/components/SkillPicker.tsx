import { useState } from 'react'
import { Input } from "#/components/ui/input.tsx"

type Skill = { name: string }

type SkillPickerProps = {
    selected: Skill[]
    onChange: (skills: Skill[]) => void
}

const PREDEFINED_SKILLS: Skill[] = [
    { name: 'Mathematics' }, { name: 'Calculus' }, { name: 'Linear Algebra' },
    { name: 'Statistics' }, { name: 'Physics' }, { name: 'Chemistry' },
    { name: 'Biology' }, { name: 'Computer Science' }, { name: 'TypeScript' },
    { name: 'Python' }, { name: 'Java' }, { name: 'C++' }, { name: 'React' },
    { name: 'Data Structures' }, { name: 'Algorithms' }, { name: 'Machine Learning' },
    { name: 'Economics' }, { name: 'History' }, { name: 'Philosophy' },
    { name: 'Literature' }, { name: 'English Writing' }, { name: 'Spanish' },
    { name: 'French' }, { name: 'German' }, { name: 'Music Theory' },
]


export function SkillPicker({ selected, onChange }: SkillPickerProps) {
    const [filter, setFilter] = useState('')

    const filtered = PREDEFINED_SKILLS.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase())
    )

    const isSelected = (skill: Skill) =>
        selected.some(s => s.name === skill.name)

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
                {filtered.length === 0 ? (
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