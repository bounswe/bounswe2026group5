import { throwApiError } from '#/lib/apiError.ts'
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
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function markNotificationRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read/`, {
        method: 'PUT',
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
}

async function registerFCMToken(token: string, device_type: 'web' | 'android' | 'ios' = 'web'): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/fcm-token/`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, device_type }),
    })
    if (!res.ok) await throwApiError(res)
}

export const notificationsQueryOptions = queryOptions({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 10_000,
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

export function useRegisterFCMToken() {
    return useMutation({
        mutationFn: ({ token, device_type }: { token: string; device_type?: 'web' | 'android' | 'ios' }) =>
            registerFCMToken(token, device_type),
    })
}

// Maps each notification type to the query keys that should be invalidated when it arrives.
export const NOTIFICATION_INVALIDATION_MAP: Record<NotificationType, string[][]> = {
    new_mentorship_request:      [['mentorship', 'requests'], ['availability-slots']],
    mentorship_request_rejected: [['mentorship', 'requests'], ['availability-slots']],
    new_match:                   [['mentorship', 'matches'], ['mentorship', 'requests']],
    slot_booked:                 [['mentorship', 'meeting-sessions', 'me'], ['mentorship', 'requests'], ['availability-slots']],
    session_canceled:            [['mentorship', 'meeting-sessions', 'me'], ['availability-slots']],
    session_rescheduled:         [['mentorship', 'meeting-sessions', 'me'], ['availability-slots']],
    match_deactivated:           [['mentorship', 'matches'], ['mentorship', 'requests']],
    new_message:                 [['messaging', 'conversations']],
    new_feedback_available:      [['profiles', 'me']],
}
