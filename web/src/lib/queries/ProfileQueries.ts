import { throwApiError } from "#/lib/apiError.ts"
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----



// GET response types

export interface MenteeProfile {
    id: string
    full_name: string
    bio: string
    show_initials_only: boolean
    picture_url: string
    audio_url?: string
    video_url?: string
    linkedin_url?: string
    skills: string[] | null
    app_usage_mode: "MENTOR" | "MENTEE" | "ADMIN"
}

export interface MentorProfile {
    id: string
    full_name: string
    bio: string
    show_initials_only: boolean
    picture_url: string
    audio_url?: string
    video_url?: string
    linkedin_url?: string
    title: string
    skills: string[] | null
    average_rating: number
    review_count: number
    total_mentee_count: number
    app_usage_mode: "MENTOR" | "MENTEE" | "ADMIN"
    is_overloaded: boolean
    active_matches_count: number
    overload_threshold: number
}

export type ProfileResponse = MenteeProfile | MentorProfile

export function isMentorProfile(p: ProfileResponse): p is MentorProfile {
    return 'total_mentee_count' in p
}
// PATCH request body
export interface UpdateProfileBody {
    display_name?: string
    bio?: string
    picture_url?: string
    title?: string
    location?: string
    show_initials_only?: boolean
    skills?: string[]
    linkedin_url?: string
}

// ---- Fetchers ----

async function fetchProfile(username: string): Promise<ProfileResponse> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export type OwnProfileResponse = ProfileResponse & { available_catalog_skills?: string[] }

async function fetchOwnProfile(): Promise<OwnProfileResponse> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function patchProfile(body: UpdateProfileBody): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) await throwApiError(res)
}

// ---- Query Options ----

export const profileQueryOptions = (username: string) =>
    queryOptions({
        queryKey: ['profiles', username],
        queryFn: () => fetchProfile(username),
        staleTime: 5 * 60 * 1000,
        gcTime: Infinity,
    })

export const ownProfileQueryOptions = queryOptions({
    queryKey: ['profiles', 'me'],
    queryFn: fetchOwnProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
})

// ---- Custom Hooks ----

export function useProfile(username: string) {
    return useQuery(profileQueryOptions(username))
}

export function useOwnProfile() {
    return useQuery(ownProfileQueryOptions)
}

export function useUpdateProfile() {
    return useMutation({
        mutationFn: (body: UpdateProfileBody) => patchProfile(body),
    })
}

async function patchUsername(newUsername: string): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/username/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: newUsername }),
    })
    if (!res.ok) await throwApiError(res)
}

export function useUpdateUsername() {
    return useMutation({
        mutationFn: (newUsername: string) => patchUsername(newUsername),
    })
}

async function uploadProfilePicture(file: File): Promise<{ picture_url: string }> {
    const token = localStorage.getItem('access_token')
    const form = new FormData()
    form.append('picture', file)
    const res = await fetch(`${API_BASE_URL}/profiles/me/picture/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export function useUploadProfilePicture() {
    return useMutation({
        mutationFn: (file: File) => uploadProfilePicture(file),
    })
}

async function uploadProfileAudio(file: File): Promise<{ audio_url: string }> {
    const token = localStorage.getItem('access_token')
    const form = new FormData()
    form.append('audio', file)
    const res = await fetch(`${API_BASE_URL}/profiles/me/audio/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export function useUploadProfileAudio() {
    return useMutation({
        mutationFn: (file: File) => uploadProfileAudio(file),
    })
}

async function deleteProfileAudio(): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/audio/`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res)
}

export function useDeleteProfileAudio() {
    return useMutation({
        mutationFn: () => deleteProfileAudio(),
    })
}

async function uploadProfileVideo(file: File): Promise<{ video_url: string }> {
    const token = localStorage.getItem('access_token')
    const form = new FormData()
    form.append('video', file)
    const res = await fetch(`${API_BASE_URL}/profiles/me/video/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export function useUploadProfileVideo() {
    return useMutation({
        mutationFn: (file: File) => uploadProfileVideo(file),
    })
}

async function deleteProfileVideo(): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/video/`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res)
}

export function useDeleteProfileVideo() {
    return useMutation({
        mutationFn: () => deleteProfileVideo(),
    })
}

// ---- Public mentor reviews ----

export interface PublicReview {
    rating: number
    text: string
    created_at: string
}

export interface PublicReviewsResponse {
    count: number
    page: number
    pageSize: number
    results: PublicReview[]
}

async function fetchMentorReviews(username: string, page: number, pageSize: number): Promise<PublicReviewsResponse> {
    const res = await fetch(
        `${API_BASE_URL}/profiles/${username}/reviews/?page=${page}&pageSize=${pageSize}`,
    )
    if (!res.ok) throw new Error('Failed to fetch reviews')
    return res.json()
}

export function useMentorReviews(username: string, page = 1, pageSize = 6) {
    return useQuery({
        queryKey: ['profiles', username, 'reviews', page],
        queryFn: () => fetchMentorReviews(username, page, pageSize),
        staleTime: 5 * 60 * 1000,
    })
}