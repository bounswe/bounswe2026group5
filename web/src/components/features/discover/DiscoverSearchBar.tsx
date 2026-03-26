// web/src/components/features/discover/DiscoverSearchBar.tsx
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiscoverSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DiscoverSearchBar({
  value,
  onChange,
  placeholder = 'Search profiles, skills, or projects...',
  className,
}: DiscoverSearchBarProps) {
  return (
    <div className={cn('relative max-w-3xl', className)}>
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-ink-soft" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-12 pr-6 py-4',
          'bg-white border border-line rounded-xl',
          'text-ink placeholder:text-ink-soft',
          'text-base font-sans',
          'shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40',
          'transition-all duration-200',
        )}
      />
    </div>
  )
}