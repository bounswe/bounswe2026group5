import { Link } from '@tanstack/react-router'
import {
    CalendarCheck,
    CheckCircle2,
    Clock,
    Info,
    MessageSquare,
    Star,
    Tag,
    UserPlus,
    UserX,
    XCircle,
    Bell,
} from 'lucide-react'
import { cn } from '#/lib/utils.ts'
import type { Notification, NotificationType } from '#/lib/queries/NotificationQueries.ts'

type VariantConfig = {
    icon: React.ComponentType<{ className?: string }>
    iconClass: string
    borderClass: string
}

const VARIANT_MAP: Record<NotificationType, VariantConfig> = {
    new_mentorship_request: {
        icon: UserPlus,
        iconClass: 'text-accent',
        borderClass: 'border-l-accent',
    },
    mentorship_request_rejected: {
        icon: XCircle,
        iconClass: 'text-red-500',
        borderClass: 'border-l-red-400',
    },
    new_match: {
        icon: CheckCircle2,
        iconClass: 'text-green-600',
        borderClass: 'border-l-green-400',
    },
    slot_booked: {
        icon: CalendarCheck,
        iconClass: 'text-green-600',
        borderClass: 'border-l-green-400',
    },
    session_canceled: {
        icon: XCircle,
        iconClass: 'text-red-500',
        borderClass: 'border-l-red-400',
    },
    session_rescheduled: {
        icon: Clock,
        iconClass: 'text-yellow-600',
        borderClass: 'border-l-yellow-400',
    },
    match_deactivated: {
        icon: UserX,
        iconClass: 'text-ink-soft',
        borderClass: 'border-l-line',
    },
    new_message: {
        icon: MessageSquare,
        iconClass: 'text-accent',
        borderClass: 'border-l-accent',
    },
    new_feedback_available: {
        icon: Star,
        iconClass: 'text-yellow-500',
        borderClass: 'border-l-yellow-400',
    },
    tag_new_member: {
        icon: UserPlus,
        iconClass: 'text-emerald-600',
        borderClass: 'border-l-emerald-400',
    },
    tag_description_updated: {
        icon: Tag,
        iconClass: 'text-blue-600',
        borderClass: 'border-l-blue-400',
    },
    tag_deleted: {
        icon: XCircle,
        iconClass: 'text-red-500',
        borderClass: 'border-l-red-400',
    },
    tag_matches_interest: {
        icon: Tag,
        iconClass: 'text-accent',
        borderClass: 'border-l-accent',
    },
    report_resolved: {
        icon: CheckCircle2,
        iconClass: 'text-blue-500',
        borderClass: 'border-l-blue-400',
    },
    workshop_cancelled: {
        icon: XCircle,
        iconClass: 'text-red-500',
        borderClass: 'border-l-red-400',
    },
    workshop_rescheduled: {
        icon: Clock,
        iconClass: 'text-yellow-600',
        borderClass: 'border-l-yellow-400',
    },
    tag_new_member: {
        icon: UserPlus,
        iconClass: 'text-accent',
        borderClass: 'border-l-accent',
    },
    tag_description_updated: {
        icon: Clock,
        iconClass: 'text-yellow-600',
        borderClass: 'border-l-yellow-400',
    },
    tag_deleted: {
        icon: UserX,
        iconClass: 'text-red-500',
        borderClass: 'border-l-red-400',
    },
    tag_matches_interest: {
        icon: Star,
        iconClass: 'text-yellow-500',
        borderClass: 'border-l-yellow-400',
    },
}

const DEFAULT_VARIANT: VariantConfig = {
    icon: Bell,
    iconClass: 'text-ink-soft',
    borderClass: 'border-l-line',
}

const FALLBACK_VARIANT: VariantConfig = {
    icon: Info,
    iconClass: 'text-ink-soft',
    borderClass: 'border-l-line',
}

function formatWorkshopRescheduledMessage(extra: Record<string, unknown>): string {
    const title = typeof extra.workshop_title === 'string' ? extra.workshop_title : 'A workshop'
    const oldStart = typeof extra.old_scheduled_at === 'string' ? new Date(extra.old_scheduled_at) : null
    const newStart = typeof extra.new_scheduled_at === 'string' ? new Date(extra.new_scheduled_at) : null
    const oldEnd = typeof extra.old_end_at === 'string' ? new Date(extra.old_end_at) : null
    const newEnd = typeof extra.new_end_at === 'string' ? new Date(extra.new_end_at) : null
    const fmt = (d: Date) => d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    const startChanged = oldStart && newStart && oldStart.getTime() !== newStart.getTime()
    if (startChanged && oldStart && newStart) {
        return `The workshop "${title}" has been rescheduled from ${fmt(oldStart)} to ${fmt(newStart)}.`
    }
    if (oldEnd && newEnd) {
        return `The workshop "${title}"'s end time has been changed from ${fmt(oldEnd)} to ${fmt(newEnd)}.`
    }
    return `The workshop "${title}" has been rescheduled.`
}

function getDisplayMessage(notification: Notification): string {
    if (notification.type === 'workshop_rescheduled') {
        return formatWorkshopRescheduledMessage(notification.extra_metadata)
    }
    return notification.message
}

export function NotificationItem({ notification }: { notification: Notification }) {
    const variant = VARIANT_MAP[notification.type] ?? FALLBACK_VARIANT
    const Icon = variant.icon
    const conversationId =
        notification.type === 'new_message' ? (notification.resource_id ?? undefined) : undefined

    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-lg border border-line border-l-4 bg-white px-4 py-3 shadow-sm',
                variant.borderClass,
            )}
        >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', variant.iconClass)} />
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-ink">{notification.title}</p>
                <p className="text-sm text-ink-soft mt-0.5 leading-relaxed">{getDisplayMessage(notification)}</p>
            </div>
            {conversationId && (
                <Link
                    to="/messages"
                    search={{ conversationId }}
                    className="shrink-0 text-xs text-accent hover:underline underline-offset-4 whitespace-nowrap"
                >
                    View conversation →
                </Link>
            )}
        </div>
    )
}
