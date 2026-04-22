import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----



// GET response types
export interface AvailabilitySlot {
    id: string
    date: string
    startTime: string
    endTime: string
    is_booked: boolean
    bookedBy: string | null
    bookedAt: string | null
    created_at: string
    updated_at: string
}

export interface MenteeProfile {
    id: string
    full_name: string
    bio: string
    hidden: boolean
    picture_url: string
    skills: string[] | null
    app_usage_mode: "MENTOR" | "MENTEE"
}

export interface MentorProfile {
    id: string
    full_name: string
    bio: string
    hidden: boolean
    picture_url: string
    title: string
    skills: string[] | null
    rating: number
    total_mentee_count: number
    app_usage_mode: "MENTOR" | "MENTEE"
}

export type ProfileResponse = MenteeProfile | MentorProfile

export function isMentorProfile(p: ProfileResponse): p is MentorProfile {
    return 'rating' in p
}

// PATCH request body
export interface UpdateProfileBody {
    display_name?: string
    bio?: string
    picture_url?: string
    title?: string
    location?: string
    is_visible?: boolean
    show_initials_only?: boolean
    skills?: string[]
}

// ---- Fetchers ----

async function fetchProfile(username: string): Promise<ProfileResponse> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export type OwnProfileResponse = ProfileResponse & { available_catalog_skills?: string[] }

async function fetchOwnProfile(): Promise<OwnProfileResponse> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`${res.status}`)
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
    if (!res.ok) throw new Error('Failed to update profile')
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
    if (!res.ok) throw new Error('Failed to update username')
}

export function useUpdateUsername() {
    return useMutation({
        mutationFn: (newUsername: string) => patchUsername(newUsername),
    })
}