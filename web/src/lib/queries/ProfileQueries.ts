import { queryOptions, useMutation, useQuery } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface Skill {
    id: number
    name: string
}

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
    expertises: string[]
}

export interface MentorProfile {
    id: string
    full_name: string
    bio: string
    hidden: boolean
    picture_url: string
    title: string
    expertises: string[]
    rating: number
    total_mentee_count: number
    available_slots: AvailabilitySlot[]
}

export type ProfileResponse = MenteeProfile | MentorProfile

export function isMentorProfile(p: ProfileResponse): p is MentorProfile {
    return 'available_slots' in p
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
    expertises?: string[]
    // eager to learn
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

async function patchProfile(username: string, body: UpdateProfileBody): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
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

export const skillsQueryOptions = queryOptions({
    queryKey: ['skills'],
    queryFn: async () => {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE_URL}/profiles/skills/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch skills')
        return res.json() as Promise<Skill[]>
    },
    staleTime: Infinity,
})

// ---- Custom Hooks ----

export function useProfile(username: string) {
    return useQuery(profileQueryOptions(username))
}

export function useUpdateProfile(username: string) {
    return useMutation({
        mutationFn: (body: UpdateProfileBody) => patchProfile(username, body),
    })
}