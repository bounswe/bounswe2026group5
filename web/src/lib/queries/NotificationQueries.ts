import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function authHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export type NotificationType =
    | 'new_mentorship_request'
    | 'mentorship_request_rejected'
    | 'new_match'
    | 'slot_booked'
    | 'session_canceled'
    | 'session_rescheduled'
    | 'match_deactivated'
    | 'new_message'
    | 'new_feedback_available'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message: string
    actor: string | null
    resource_type: string
    resource_id: string | null
    action_url: string
    extra_metadata: Record<string, unknown>
    is_read: boolean
    created_at: string
}

async function fetchNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE_URL}/notifications/`, {
        headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

async function markNotificationRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read/`, {
        method: 'PUT',
        headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`${res.status}`)
}

export const notificationsQueryOptions = queryOptions({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    refetchInterval: 30_000,
})

export function useNotifications() {
    return useQuery(notificationsQueryOptions)
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (ids: string[]) => Promise.all(ids.map(markNotificationRead)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}
