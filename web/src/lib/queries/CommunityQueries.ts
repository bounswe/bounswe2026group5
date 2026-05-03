import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { throwApiError } from '#/lib/apiError.ts'
import type { PublicMentorProfile } from '#/lib/queries/DiscoverQueries.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommunityTag {
    id: string
    name: string
    slug: string
    description: string
    member_count: number
    created_at: string
}

export interface CommunityTagDetail extends CommunityTag {
    created_by_username: string | null
    is_member: boolean
}

export interface CommunityListResponse {
    count: number
    page: number
    pageSize: number
    results: CommunityTag[]
}

export interface CommunityMembersResponse {
    count: number
    page: number
    pageSize: number
    results: PublicMentorProfile[]
}

export interface CommunityMembershipResponse {
    tag_id: string
    tag_name: string
    tag_slug: string
    joined: boolean
}

export type PopularCommunitiesWindow = 'all' | '7d' | '30d'

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

export async function fetchCommunities(params: {
    q?: string
    page: number
    pageSize: number
}): Promise<CommunityListResponse> {
    const url = new URL(`${API_BASE_URL}/profiles/tags/`, window.location.origin)
    if (params.q) url.searchParams.set('q', params.q)
    url.searchParams.set('page', String(params.page))
    url.searchParams.set('pageSize', String(params.pageSize))
    const res = await fetch(url.toString())
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchPopularCommunities(
    limit = 6,
    timeWindow: PopularCommunitiesWindow = 'all',
): Promise<CommunityTag[]> {
    const url = new URL(`${API_BASE_URL}/profiles/tags/popular/`, globalThis.location.origin)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('window', timeWindow)
    const res = await fetch(url.toString())
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchMyCommunities(): Promise<CommunityTag[]> {
    const res = await fetch(`${API_BASE_URL}/profiles/me/tags/`, {
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchCommunityDetail(communityId: string): Promise<CommunityTagDetail> {
    const res = await fetch(`${API_BASE_URL}/profiles/tags/${encodeURIComponent(communityId)}/`, {
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function fetchCommunityMembers(params: {
    communityId: string
    page: number
    pageSize: number
}): Promise<CommunityMembersResponse> {
    const url = new URL(
        `${API_BASE_URL}/profiles/tags/${encodeURIComponent(params.communityId)}/members/`,
        window.location.origin,
    )
    url.searchParams.set('page', String(params.page))
    url.searchParams.set('pageSize', String(params.pageSize))
    const res = await fetch(url.toString())
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function createCommunity(payload: {
    name: string
    description?: string
}): Promise<CommunityTagDetail> {
    const res = await fetch(`${API_BASE_URL}/profiles/tags/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.name.trim(), description: payload.description?.trim() ?? '' }),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function joinCommunity(communityId: string): Promise<CommunityMembershipResponse> {
    const res = await fetch(`${API_BASE_URL}/profiles/tags/${encodeURIComponent(communityId)}/join/`, {
        method: 'POST',
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function leaveCommunity(communityId: string): Promise<CommunityMembershipResponse> {
    const res = await fetch(`${API_BASE_URL}/profiles/tags/${encodeURIComponent(communityId)}/leave/`, {
        method: 'DELETE',
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const communityQueryKeys = {
    all: ['communities'] as const,
    list: (q?: string, pageSize?: number) => ['communities', 'list', q ?? '', pageSize ?? 6] as const,
    popular: (limit?: number) => ['communities', 'popular', limit ?? 6] as const,
    my: () => ['communities', 'me'] as const,
    detail: (communityId?: string) => ['communities', 'detail', communityId ?? ''] as const,
    members: (communityId: string, page: number) => ['communities', 'members', communityId, page] as const,
}

// ---------------------------------------------------------------------------
// Query options factories
// ---------------------------------------------------------------------------

export const communityListInfiniteQueryOptions = (q?: string, pageSize = 6) =>
    infiniteQueryOptions({
        queryKey: communityQueryKeys.list(q, pageSize),
        queryFn: ({ pageParam }) =>
            fetchCommunities({ q, page: pageParam as number, pageSize }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const fetched = lastPage.page * lastPage.pageSize
            return fetched < lastPage.count ? lastPage.page + 1 : undefined
        },
        staleTime: 30_000,
    })

export const popularCommunitiesQueryOptions = (limit = 6) =>
    queryOptions({
        queryKey: communityQueryKeys.popular(limit),
        queryFn: () => fetchPopularCommunities(limit),
        staleTime: 5 * 60 * 1000,
    })

export const myCommunitiesQueryOptions = () =>
    queryOptions({
        queryKey: communityQueryKeys.my(),
        queryFn: fetchMyCommunities,
        staleTime: 30_000,
    })

export const communityDetailQueryOptions = (communityId: string) =>
    queryOptions({
        queryKey: communityQueryKeys.detail(communityId),
        queryFn: () => fetchCommunityDetail(communityId),
        enabled: Boolean(communityId),
        staleTime: 30_000,
    })

export const communityMembersQueryOptions = (communityId: string, page: number, pageSize = 9) =>
    queryOptions({
        queryKey: communityQueryKeys.members(communityId, page),
        queryFn: () => fetchCommunityMembers({ communityId, page, pageSize }),
        enabled: Boolean(communityId),
        staleTime: 30_000,
    })

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateCommunityMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createCommunity,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.all })
        },
    })
}

export function useJoinCommunityMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: joinCommunity,
        onSuccess: async (membership) => {
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.all })
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.detail(membership.tag_id) })
        },
    })
}

export function useLeaveCommunityMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: leaveCommunity,
        onSuccess: async (membership) => {
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.all })
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.detail(membership.tag_id) })
        },
    })
}
