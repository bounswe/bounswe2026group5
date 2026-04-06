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

export interface UpcomingSession { // for mentee
    slot_id: string
    mentor: MatchUser
    slot_date: string
    slot_start_time: string
    slot_end_time: string
    status: string
    booked_at: string
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

async function fetchUpcomingSessions(): Promise<UpcomingSession[]> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/mentorship/sessions/me/upcoming/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to fetch upcoming sessions')
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

export const upcomingSessionsQueryOptions = queryOptions({
    queryKey: ['mentorship', 'sessions', 'upcoming'],
    queryFn: fetchUpcomingSessions,
    staleTime: 0,
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

export function useUpcomingSessions() {
    return useQuery(upcomingSessionsQueryOptions)
}