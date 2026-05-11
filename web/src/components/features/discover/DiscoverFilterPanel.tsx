// web/src/components/features/discover/DiscoverFilterPanel.tsx
import { useRef, useEffect, useState } from 'react'
import { SlidersHorizontal, X, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const DISTANCE_OPTIONS_KM = [5, 15, 25, 50]

interface DiscoverFilterPanelProps {
  allSkills: string[]
  selectedSkills: Set<string>
  selectedDistanceKm: number | null
  onToggle: (skill: string) => void
  onClear: () => void
  onDistanceChange: (distanceKm: number | null) => void
}

export function DiscoverFilterPanel({
  allSkills,
  selectedSkills,
  selectedDistanceKm,
  onToggle,
  onClear,
  onDistanceChange,
}: Readonly<DiscoverFilterPanelProps>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const skillCount = selectedSkills.size
  const totalCount = skillCount + (selectedDistanceKm !== null ? 1 : 0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleClearAll = () => {
    onClear()
    onDistanceChange(null)
  }

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button — matches search bar height via self-stretch on parent */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Filter mentors"
        aria-expanded={open}
        className={cn(
          'h-full flex items-center gap-2 px-5 rounded-2xl border',
          'text-sm font-medium transition-all duration-200',
          'shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30',
          open || totalCount > 0
            ? 'bg-accent text-white border-accent hover:bg-accent-light'
            : 'bg-mist border-line text-ink hover:bg-background hover:border-accent/40',
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Filter</span>
        {totalCount > 0 && (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white/25 text-xs font-bold leading-none">
            {totalCount}
          </span>
        )}
      </button>

      {/* Floating panel — right-aligned, capped so it never escapes the viewport */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 island-shell rounded-2xl shadow-2xl p-5 w-80 max-w-[calc(100vw-1.5rem)] flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-sm font-bold text-ink">
              Filter Mentors
            </span>
            {totalCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-accent-aa hover:text-accent font-semibold transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Distance section */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Distance
            </span>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS_KM.map((km) => {
                const active = selectedDistanceKm === km
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={() => onDistanceChange(active ? null : km)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-150',
                      active
                        ? 'bg-accent text-white shadow-sm scale-105'
                        : 'bg-accent-muted text-ink hover:bg-accent/20 border border-accent/10',
                    )}
                  >
                    {km} km
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-line" />

          {/* Skills section */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Skills
            </span>
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
          </div>

          {totalCount > 0 && (
            <p className="text-xs text-ink-soft border-t border-line pt-3 shrink-0">
              Showing mentors
              {selectedDistanceKm !== null && (
                <> within <span className="font-semibold text-ink">{selectedDistanceKm} km</span></>
              )}
              {skillCount > 0 && (
                <>
                  {selectedDistanceKm !== null ? ' with ' : ' with '}
                  <span className="font-semibold text-ink">any</span> of the{' '}
                  {skillCount} selected {skillCount === 1 ? 'skill' : 'skills'}
                </>
              )}
              .
            </p>
          )}
        </div>
      )}
    </div>
  )
}