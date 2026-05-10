import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { throwApiError } from '#/lib/apiError.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkshopAuthor {
    id: string
    username: string
    display_name: string
    picture_url: string | null
    title: string
}

export interface WorkshopParticipant {
    id: string
    participant: WorkshopAuthor
    joined_at: string
    show_on_profile: boolean
}

export interface CommunityWorkshop {
    id: string
    community_id: string
    community_name: string
    author: WorkshopAuthor
    title: string
    description: string
    scheduled_at: string
    end_at: string
    max_participants: number
    participant_count: number
    is_full: boolean
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
    current_user_enrolled: boolean
    created_at: string
    updated_at: string
}

export interface CommunityWorkshopDetail extends CommunityWorkshop {
    participants: WorkshopParticipant[]
}

export interface WorkshopAttendanceItem {
    id: string
    workshop_id: string
    workshop_title: string
    workshop_description: string
    workshop_status: string
    workshop_scheduled_at: string
    workshop_end_at: string
    community_id: string
    community_name: string
    author: WorkshopAuthor
    joined_at: string
    show_on_profile: boolean
    attendance_status: 'attending' | 'attended'
}

export interface WorkshopListResponse {
    count: number
    offset: number
    limit: number
    results: CommunityWorkshop[]
}

export interface WorkshopAttendanceResponse {
    count: number
    attending_count: number
    attended_count: number
    offset: number
    limit: number
    results: WorkshopAttendanceItem[]
}

export interface WorkshopCreatePayload {
    title: string
    description?: string
    scheduled_at: string
    end_at: string
    max_participants: number
}

export interface WorkshopUpdatePayload {
    title?: string
    description?: string
    scheduled_at?: string
    end_at?: string
    max_participants?: number
    status?: 'SCHEDULED'
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export async function fetchCommunityWorkshops(
    tagId: string,
    status?: string,
): Promise<WorkshopListResponse> {
    const url = new URL(`${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/`, window.location.origin)
    if (status) url.searchParams.set('status', status)
    const res = await fetch(url.toString(), { headers: authHeaders() })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchCommunityWorkshopDetail(
    tagId: string,
    workshopId: string,
): Promise<CommunityWorkshopDetail> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
        { headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function createCommunityWorkshop(
    tagId: string,
    payload: WorkshopCreatePayload,
): Promise<CommunityWorkshopDetail> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/`,
        {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function updateCommunityWorkshop(
    tagId: string,
    workshopId: string,
    payload: WorkshopUpdatePayload,
): Promise<CommunityWorkshopDetail> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
        {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function deleteCommunityWorkshop(tagId: string, workshopId: string): Promise<void> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
        { method: 'DELETE', headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
}

export async function joinWorkshop(tagId: string, workshopId: string): Promise<CommunityWorkshopDetail> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/join/`,
        { method: 'POST', headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function leaveWorkshop(tagId: string, workshopId: string): Promise<void> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/leave/`,
        { method: 'POST', headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
}

export async function fetchProfileWorkshopAttendance(
    username: string,
    status?: 'all' | 'attending' | 'attended',
): Promise<WorkshopAttendanceResponse> {
    const url = new URL(`${API_BASE_URL}/profiles/${encodeURIComponent(username)}/workshops/attendance/`, window.location.origin)
    if (status && status !== 'all') url.searchParams.set('status', status)
    const res = await fetch(url.toString(), { headers: authHeaders() })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchMyWorkshopAttendance(
    status?: 'all' | 'attending' | 'attended',
): Promise<WorkshopAttendanceResponse> {
    const url = new URL(`${API_BASE_URL}/profiles/me/workshops/attendance/`, window.location.origin)
    if (status && status !== 'all') url.searchParams.set('status', status)
    const res = await fetch(url.toString(), { headers: authHeaders() })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const workshopQueryKeys = {
    all: ['workshops'] as const,
    community: (tagId: string) => ['workshops', 'community', tagId] as const,
    detail: (tagId: string, workshopId: string) => ['workshops', 'community', tagId, workshopId] as const,
    profileAttendance: (username: string) => ['workshops', 'attendance', username] as const,
    myAttendance: () => ['workshops', 'attendance', 'me'] as const,
}

// ---------------------------------------------------------------------------
// Query options factories
// ---------------------------------------------------------------------------

export const communityWorkshopsQueryOptions = (tagId: string) =>
    queryOptions({
        queryKey: workshopQueryKeys.community(tagId),
        queryFn: () => fetchCommunityWorkshops(tagId),
        enabled: Boolean(tagId),
        staleTime: 30_000,
    })

export const communityWorkshopDetailQueryOptions = (tagId: string, workshopId: string) =>
    queryOptions({
        queryKey: workshopQueryKeys.detail(tagId, workshopId),
        queryFn: () => fetchCommunityWorkshopDetail(tagId, workshopId),
        enabled: Boolean(tagId) && Boolean(workshopId),
        staleTime: 30_000,
    })

export const myWorkshopAttendanceQueryOptions = (status?: 'all' | 'attending' | 'attended') =>
    queryOptions({
        queryKey: [...workshopQueryKeys.myAttendance(), status ?? 'all'],
        queryFn: () => fetchMyWorkshopAttendance(status),
        staleTime: 30_000,
    })

export const profileWorkshopAttendanceQueryOptions = (username: string, status?: 'all' | 'attending' | 'attended') =>
    queryOptions({
        queryKey: [...workshopQueryKeys.profileAttendance(username), status ?? 'all'],
        queryFn: () => fetchProfileWorkshopAttendance(username, status),
        enabled: Boolean(username),
        staleTime: 30_000,
    })

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateWorkshopMutation(tagId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: WorkshopCreatePayload) => createCommunityWorkshop(tagId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.community(tagId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.myAttendance() })
        },
    })
}

export function useUpdateWorkshopMutation(tagId: string, workshopId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: WorkshopUpdatePayload) => updateCommunityWorkshop(tagId, workshopId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.detail(tagId, workshopId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.community(tagId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.myAttendance() })
        },
    })
}

export function useDeleteWorkshopMutation(tagId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (workshopId: string) => deleteCommunityWorkshop(tagId, workshopId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.community(tagId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.myAttendance() })
        },
    })
}

export function useJoinWorkshopMutation(tagId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (workshopId: string) => joinWorkshop(tagId, workshopId),
        onSuccess: async (_data, workshopId) => {
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.detail(tagId, workshopId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.community(tagId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.myAttendance() })
        },
    })
}

export function useLeaveWorkshopMutation(tagId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (workshopId: string) => leaveWorkshop(tagId, workshopId),
        onSuccess: async (_data, workshopId) => {
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.detail(tagId, workshopId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.community(tagId) })
            await queryClient.invalidateQueries({ queryKey: workshopQueryKeys.myAttendance() })
        },
    })
}

export function useCommunityWorkshops(tagId: string) {
    return useQuery(communityWorkshopsQueryOptions(tagId))
}

export function useCommunityWorkshopDetail(tagId: string, workshopId: string) {
    return useQuery(communityWorkshopDetailQueryOptions(tagId, workshopId))
}

export function useMyWorkshopAttendance(status?: 'all' | 'attending' | 'attended') {
    return useQuery(myWorkshopAttendanceQueryOptions(status))
}

export function useProfileWorkshopAttendance(username: string, status?: 'all' | 'attending' | 'attended') {
    return useQuery(profileWorkshopAttendanceQueryOptions(username, status))
}