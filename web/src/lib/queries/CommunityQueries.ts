import { infiniteQueryOptions, queryOptions, useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export interface TaggableUser {
    username: string
    display_name: string
}

export interface CommunityPostAuthor {
    id: string
    username: string
    display_name: string
    picture_url: string | null
    title: string
}

export interface CommunityPost {
    id: string
    source_id: string
    category: string
    event_type: 'achievement' | 'social' | 'progress'
    content: string
    media_url: string | null
    timestamp: string
    created_at: string
    last_edited: string | null
    show_on_profile: boolean
    community_id: string
    community_slug: string
    author: CommunityPostAuthor
    tagged_users: { user_id: string; username: string }[]
}

export interface CommunityPostFeed {
    count: number
    offset: number
    limit: number
    results: CommunityPost[]
}

export interface CommunityPostCreatePayload {
    event_type: 'achievement' | 'social' | 'progress'
    content: string
    media_url?: string
    show_on_profile?: boolean
    tagged_users?: string[]
}

export interface CommunityPostUpdatePayload {
    content?: string
    event_type?: 'achievement' | 'social' | 'progress'
    media_url?: string | null
    show_on_profile?: boolean
    tagged_users?: string[]
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

export async function updateCommunityDescription(payload: {
    communityId: string
    description: string
}): Promise<CommunityTagDetail> {
    const res = await fetch(`${API_BASE_URL}/profiles/tags/${encodeURIComponent(payload.communityId)}/`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: payload.description.trim() }),
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

async function fetchTaggableUsers(communityId: string): Promise<{ count: number; results: TaggableUser[] }> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${communityId}/taggable-users/`,
        { headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function fetchCommunityPosts(communityId: string, offset = 0, limit = 20): Promise<CommunityPostFeed> {
    const url = new URL(`${API_BASE_URL}/profiles/tags/${communityId}/posts/`, window.location.origin)
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('limit', String(limit))
    const res = await fetch(url.toString(), { headers: authHeaders() })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function createCommunityPost(
    communityId: string,
    payload: CommunityPostCreatePayload,
): Promise<CommunityPost> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${communityId}/posts/`,
        {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function editCommunityPost(
    communityId: string,
    postId: string,
    payload: CommunityPostUpdatePayload,
): Promise<CommunityPost> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${communityId}/posts/${postId}/`,
        {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function deleteCommunityPost(communityId: string, postId: string): Promise<void> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/tags/${communityId}/posts/${postId}/`,
        { method: 'DELETE', headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
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
    taggableUsers: (communityId: string) => ['communities', communityId, 'taggable-users'] as const,
    posts: (communityId: string) => ['communities', communityId, 'posts'] as const,
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

export const taggableUsersQueryOptions = (communityId: string) =>
    queryOptions({
        queryKey: communityQueryKeys.taggableUsers(communityId),
        queryFn: () => fetchTaggableUsers(communityId),
        enabled: Boolean(communityId),
        staleTime: 60_000,
        select: (data) => data.results,
    })

export const communityPostsQueryOptions = (communityId: string) =>
    queryOptions({
        queryKey: communityQueryKeys.posts(communityId),
        queryFn: () => fetchCommunityPosts(communityId),
        enabled: Boolean(communityId),
        staleTime: 30_000,
    })

const COMMUNITY_POSTS_PAGE_SIZE = 20

export const communityPostsInfiniteQueryOptions = (communityId: string) =>
    infiniteQueryOptions({
        queryKey: [...communityQueryKeys.posts(communityId), 'infinite'],
        queryFn: ({ pageParam }) => fetchCommunityPosts(communityId, pageParam as number, COMMUNITY_POSTS_PAGE_SIZE),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const fetched = lastPage.offset + lastPage.results.length
            return fetched < lastPage.count ? fetched : undefined
        },
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

export function useUpdateCommunityDescriptionMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateCommunityDescription,
        onSuccess: async (updated) => {
            await queryClient.invalidateQueries({ queryKey: communityQueryKeys.detail(updated.slug) })
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

export function useTaggableUsers(communityId: string) {
    return useQuery(taggableUsersQueryOptions(communityId))
}

export function useCommunityPosts(communityId: string) {
    return useQuery(communityPostsQueryOptions(communityId))
}

export function useInfiniteCommunityPosts(communityId: string) {
    return useInfiniteQuery(communityPostsInfiniteQueryOptions(communityId))
}

function invalidatePosts(queryClient: ReturnType<typeof useQueryClient>, communityId: string) {
    return queryClient.invalidateQueries({ queryKey: communityQueryKeys.posts(communityId) })
}

export function useCreateCommunityPost(communityId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: CommunityPostCreatePayload) => createCommunityPost(communityId, payload),
        onSuccess: () => invalidatePosts(queryClient, communityId),
    })
}

export function useEditCommunityPost(communityId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ postId, payload }: { postId: string; payload: CommunityPostUpdatePayload }) =>
            editCommunityPost(communityId, postId, payload),
        onSuccess: () => invalidatePosts(queryClient, communityId),
    })
}

export function useDeleteCommunityPost(communityId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (postId: string) => deleteCommunityPost(communityId, postId),
        onSuccess: () => invalidatePosts(queryClient, communityId),
    })
}
