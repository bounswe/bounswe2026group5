// web/src/components/features/discover/DiscoverFilterPanel.tsx
import { useRef, useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiscoverFilterPanelProps {
  allSkills: string[]
  selectedSkills: Set<string>
  onToggle: (skill: string) => void
  onClear: () => void
}

export function DiscoverFilterPanel({
  allSkills,
  selectedSkills,
  onToggle,
  onClear,
}: Readonly<DiscoverFilterPanelProps>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = selectedSkills.size

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button — matches search bar height via self-stretch on parent */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Filter by skill"
        aria-expanded={open}
        className={cn(
          'h-full flex items-center gap-2 px-5 rounded-2xl border',
          'text-sm font-medium transition-all duration-200',
          'shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30',
          open || count > 0
            ? 'bg-accent text-white border-accent hover:bg-accent-light'
            : 'bg-mist border-line text-ink hover:bg-background hover:border-accent/40',
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Filter</span>
        {count > 0 && (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white/25 text-xs font-bold leading-none">
            {count}
          </span>
        )}
      </button>

      {/* Floating panel — right-aligned, capped so it never escapes the viewport */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 island-shell rounded-2xl shadow-2xl p-5 w-72 max-w-[calc(100vw-1.5rem)] flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Filter by Skill
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 text-xs text-accent-aa hover:text-accent font-semibold transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Skill chips — scrollable when list grows */}
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--iris)_transparent]">
            {/* Skills are sorted alphabetically in the caller (ALL_SKILLS) */}
            {allSkills.map((skill) => {
              const active = selectedSkills.has(skill)
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onToggle(skill)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-150',
                    active
                      ? 'bg-accent text-white shadow-sm scale-105'
                      : 'bg-accent-muted text-ink hover:bg-accent/20 border border-accent/10',
                  )}
                >
                  {skill}
                </button>
              )
            })}
          </div>

          {count > 0 && (
            <p className="text-xs text-ink-soft border-t border-line pt-3 shrink-0">
              Showing mentors with{' '}
              <span className="font-semibold text-ink">any</span> of the{' '}
              {count} selected {count === 1 ? 'skill' : 'skills'}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}