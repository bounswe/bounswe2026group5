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

}: Readonly<DiscoverSearchBarProps>) {

  return (
    <div className={cn('relative w-full', className)}>
      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
        <Search className="h-6 w-6 text-ink-soft" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-14 pr-6 py-5',
          'bg-mist border border-line rounded-2xl',
          'text-ink placeholder:text-ink-soft',
          'text-base sm:text-lg font-sans',
          'shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40',
          'transition-all duration-200',
          'hover:bg-background',
        )}
      />
    </div>
  )
}