import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { throwApiError } from '#/lib/apiError.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface ProfilePostAuthor {
    id: string
    username: string
    display_name: string
    picture_url: string | null
    title: string
}

export interface ProfilePost {
    id: string
    source_id: string
    category: 'PrP' | 'MCTE'
    event_type: 'achievement' | 'social' | 'progress'
    content: string
    media_url: string | null
    timestamp: string
    created_at: string
    last_edited: string | null
    show_on_profile: boolean
    actor_role: string
    mentorship_partner: string | null
    author: ProfilePostAuthor
}

export interface ProfilePostFeed {
    count: number
    offset: number
    limit: number
    results: ProfilePost[]
}

export interface ProfilePostCreatePayload {
    event_type: 'achievement' | 'social' | 'progress'
    content: string
    media_url?: string
}

export interface ProfilePostUpdatePayload {
    content?: string
    event_type?: 'achievement' | 'social' | 'progress'
    media_url?: string | null
}

// ---- Helpers ----

function withAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---- Fetchers ----

async function fetchProfilePosts(username: string): Promise<ProfilePostFeed> {
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/posts/`, {
        headers: withAuthHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function createProfilePost(payload: ProfilePostCreatePayload): Promise<ProfilePost> {
    const res = await fetch(`${API_BASE_URL}/profiles/me/posts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuthHeaders() },
        body: JSON.stringify(payload),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function editProfilePost(postId: string, payload: ProfilePostUpdatePayload): Promise<ProfilePost> {
    const res = await fetch(`${API_BASE_URL}/profiles/me/posts/${postId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...withAuthHeaders() },
        body: JSON.stringify(payload),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function deleteProfilePost(postId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/profiles/me/posts/${postId}/`, {
        method: 'DELETE',
        headers: withAuthHeaders(),
    })
    if (!res.ok) await throwApiError(res)
}

// ---- Query Options ----

export const profilePostsQueryOptions = (username: string) =>
    queryOptions({
        queryKey: ['profiles', username, 'posts'],
        queryFn: () => fetchProfilePosts(username),
        staleTime: 30 * 1000,
    })

// ---- Hooks ----

export function useProfilePosts(username: string) {
    return useQuery(profilePostsQueryOptions(username))
}

export function useCreateProfilePost(username: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: ProfilePostCreatePayload) => createProfilePost(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles', username, 'posts'] })
        },
    })
}

export function useEditProfilePost(username: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ postId, payload }: { postId: string; payload: ProfilePostUpdatePayload }) =>
            editProfilePost(postId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles', username, 'posts'] })
        },
    })
}

export function useDeleteProfilePost(username: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (postId: string) => deleteProfilePost(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles', username, 'posts'] })
        },
    })
}
