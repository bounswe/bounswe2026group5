import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { throwApiError } from '#/lib/apiError.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface JourneyEventAuthor {
    id: string
    username: string
    display_name: string
    picture_url: string | null
}

export interface JourneyEvent {
    id: string
    type: string
    category: 'AGTE' | 'MCTE'
    timestamp: string
    actor_role: string
    payload: Record<string, unknown> | null
    content: string
    media_url: string | null
    show_on_profile: boolean
    author: JourneyEventAuthor | null
    is_editable: boolean
}

export interface JourneyFeed {
    ordering: string
    count: number
    offset: number
    limit: number
    results: JourneyEvent[]
}

export interface MCTECreatePayload {
    event_type: 'achievement' | 'social' | 'progress'
    content: string
    media_url?: string
    show_on_profile?: boolean
}

export interface MCTEUpdatePayload {
    content?: string
    media_url?: string | null
    show_on_profile?: boolean
}

// ---- Helpers ----

function withAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---- Fetchers ----

async function fetchMatchJourney(
    matchId: string,
    offset = 0,
    limit = 50,
): Promise<JourneyFeed> {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
    const res = await fetch(
        `${API_BASE_URL}/mentorship/matches/${matchId}/journey/?${params}`,
        { headers: withAuthHeaders() },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function createMCTE(matchId: string, payload: MCTECreatePayload): Promise<JourneyEvent> {
    const res = await fetch(`${API_BASE_URL}/mentorship/matches/${matchId}/journey/events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuthHeaders() },
        body: JSON.stringify(payload),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function editMCTE(
    matchId: string,
    eventId: string,
    payload: MCTEUpdatePayload,
): Promise<JourneyEvent> {
    const res = await fetch(
        `${API_BASE_URL}/mentorship/matches/${matchId}/journey/events/${eventId}/`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...withAuthHeaders() },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function deleteMCTE(matchId: string, eventId: string): Promise<void> {
    const res = await fetch(
        `${API_BASE_URL}/mentorship/matches/${matchId}/journey/events/${eventId}/`,
        { method: 'DELETE', headers: withAuthHeaders() },
    )
    if (!res.ok) await throwApiError(res)
}

// ---- Query Options ----

export const matchJourneyQueryOptions = (matchId: string) =>
    queryOptions({
        queryKey: ['timeline', 'journey', matchId],
        queryFn: () => fetchMatchJourney(matchId),
        staleTime: 30 * 1000,
    })

// ---- Hooks ----

export function useMatchJourney(matchId: string) {
    return useQuery(matchJourneyQueryOptions(matchId))
}

export function useCreateMCTE(matchId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: MCTECreatePayload) => createMCTE(matchId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'journey', matchId] })
        },
    })
}

export function useEditMCTE(matchId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ eventId, payload }: { eventId: string; payload: MCTEUpdatePayload }) =>
            editMCTE(matchId, eventId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'journey', matchId] })
        },
    })
}

export function useDeleteMCTE(matchId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (eventId: string) => deleteMCTE(matchId, eventId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'journey', matchId] })
        },
    })
}
