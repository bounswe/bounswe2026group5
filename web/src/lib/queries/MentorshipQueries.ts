import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface MatchUser {
    id: string
    username: string
    display_name: string
    picture_url: string
    title: string
}

export interface Match {
    id: string
    mentor: MatchUser
    mentee: MatchUser
    request_id: string
    is_active: boolean
}

export interface MentorshipRequest {
    id: string
    mentor: MatchUser
    mentee: MatchUser
    slot_id: string
    slot_date: string
    slot_start_time: string
    slot_end_time: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
    cover_letter: string
    created_at: string
    responded_at: string | null
}

export type MeetingSessionRoleFilter = 'mentor' | 'mentee' | 'all'

export type MeetingSessionStatusFilter =
    | 'upcoming'
    | 'past'
    | 'scheduled'
    | 'rescheduled'
    | 'canceled'
    | 'completed'

export interface MeetingSession {
    session_id: string
    match_id: string
    mentor: MatchUser
    mentee: MatchUser
    source_slot_id: string | null
    scheduled_start_at: string
    scheduled_end_at: string
    status: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED' | 'COMPLETED'
    display_status: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED' | 'COMPLETED'
    my_role: 'MENTOR' | 'MENTEE' | 'UNKNOWN'
    allowed_actions: string[]
    canceled_by_role: 'MENTOR' | 'MENTEE' | null
    cancel_reason: string
    created_at: string
    updated_at: string
}

interface MeetingSessionQueryParams {
    role?: MeetingSessionRoleFilter
    status?: MeetingSessionStatusFilter
}

// ---- Fetchers ----

async function fetchMyMatches(): Promise<Match[]> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/mentorship/matches/me/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to fetch matches')
    return res.json()
}

async function sendMentorshipRequest(body: {
    mentor_username: string
    slot_id: string
    cover_letter: string
}): Promise<MentorshipRequest> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/mentorship/requests/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to send mentorship request')
    return res.json()
}

export async function fetchMyRequests(): Promise<MentorshipRequest[]> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/mentorship/requests/me/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to fetch requests')
    return res.json()
}

async function respondToRequest(requestId: string, action: 'accept' | 'reject'): Promise<MentorshipRequest> {
    const token = localStorage.getItem('access_token')
    const formData = new FormData()
    formData.append('action', action)
    const res = await fetch(`${API_BASE_URL}/mentorship/requests/${requestId}/respond/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    })
    if (!res.ok) throw new Error('Failed to respond to request')
    return res.json()
}

function withAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchMeetingSessions(params: MeetingSessionQueryParams = {}): Promise<MeetingSession[]> {
    const query = new URLSearchParams()
    if (params.role && params.role !== 'all') {
        query.set('role', params.role)
    }
    if (params.status) {
        query.set('status', params.status)
    }

    const queryString = query.toString()
    const suffix = queryString ? `?${queryString}` : ''
    const url = `${API_BASE_URL}/mentorship/meeting-sessions/me/${suffix}`

    const res = await fetch(url, {
        headers: withAuthHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch meeting sessions')
    return res.json()
}


// ---- Query Options ----

export const myMatchesQueryOptions = queryOptions({
    queryKey: ['mentorship', 'matches'],
    queryFn: fetchMyMatches,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
})
export const myRequestsQueryOptions = queryOptions({
    queryKey: ['mentorship', 'requests'],
    queryFn: fetchMyRequests,
    staleTime: 2 * 60 * 1000,
    gcTime: Infinity,
})

export const meetingSessionsQueryOptions = (params: MeetingSessionQueryParams = {}) =>
    queryOptions({
        queryKey: [
            'mentorship',
            'meeting-sessions',
            'me',
            params.role ?? 'all',
            params.status ?? 'all',
        ],
        queryFn: () => fetchMeetingSessions(params),
        staleTime: 30 * 1000,
        gcTime: Infinity,
    })

// ---- Hooks ----

export function useMyMatches() {
    return useQuery(myMatchesQueryOptions)
}

export function useSendMentorshipRequest() {
    return useMutation({
        mutationFn: sendMentorshipRequest,
    })
}
export function useMyRequests() {
    return useQuery(myRequestsQueryOptions)
}

export function useRespondToRequest() {
    return useMutation({
        mutationFn: ({ requestId, action }: { requestId: string; action: 'accept' | 'reject' }) =>
            respondToRequest(requestId, action),
    })
}

export function useMeetingSessions(params: MeetingSessionQueryParams = {}) {
    return useQuery(meetingSessionsQueryOptions(params))
}
