import { Link } from '@tanstack/react-router'
import { Calendar, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn, getAbsoluteMediaUrl } from '@/lib/utils'
import type { CommunityWorkshop } from '@/lib/queries/WorkshopQueries.ts'

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
]

function formatWorkshopDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatWorkshopTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function WorkshopStatusBadge({ workshop }: { workshop: CommunityWorkshop }) {
    if (workshop.status === 'CANCELLED') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                Cancelled
            </span>
        )
    }
    if (workshop.status === 'COMPLETED') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Ended
            </span>
        )
    }
    if (workshop.is_full) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                Full
            </span>
        )
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            Open
        </span>
    )
}

interface WorkshopCardProps {
    workshop: CommunityWorkshop
    onViewDetails: (workshop: CommunityWorkshop) => void
}

export function WorkshopCard({ workshop, onViewDetails }: WorkshopCardProps) {
    const colorClass = AVATAR_COLORS[workshop.author.display_name.length % AVATAR_COLORS.length]
    const initials = workshop.author.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    const capacityPct = workshop.max_participants > 0 ? workshop.participant_count / workshop.max_participants : 0
    const capacityClass = capacityPct >= 1
        ? 'text-red-600'
        : capacityPct >= 0.8
        ? 'text-amber-600'
        : 'text-ink-soft'

    return (
        <Card className="island-shell border-line bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
            <div className="bg-accent h-1 w-full" />
            <CardContent className="p-5 flex flex-col gap-3 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-ink leading-snug line-clamp-2">{workshop.title}</h3>
                    </div>
                    <WorkshopStatusBadge workshop={workshop} />
                </div>

                {/* Description */}
                {workshop.description && (
                    <p className="text-sm text-ink-soft line-clamp-2 leading-relaxed">{workshop.description}</p>
                )}

                {/* Date & Time */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatWorkshopDate(workshop.scheduled_at)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatWorkshopTime(workshop.scheduled_at)} – {formatWorkshopTime(workshop.end_at)}
                    </div>
                </div>

                {/* Capacity */}
                <div className={cn('flex items-center gap-1.5 text-xs font-medium', capacityClass)}>
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    {workshop.participant_count-1}/{workshop.max_participants} Enrolled
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-line">
                    {workshop.author.picture_url ? (
                        <img
                            src={getAbsoluteMediaUrl(workshop.author.picture_url)}
                            alt={workshop.author.display_name}
                            className="h-7 w-7 rounded-full object-cover border border-white/50 shrink-0"
                        />
                    ) : (
                        <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-white/50', colorClass)}>
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <Link
                            to="/profiles/$username"
                            params={{ username: workshop.author.username }}
                            className="text-xs font-medium text-ink hover:underline truncate block"
                        >
                            {workshop.author.display_name}
                        </Link>
                        {workshop.author.title && (
                            <p className="text-xs text-ink-soft truncate">{workshop.author.title}</p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-7 px-3"
                        onClick={() => onViewDetails(workshop)}
                    >
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}