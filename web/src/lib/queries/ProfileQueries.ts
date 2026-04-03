import {queryOptions, useMutation, useQuery,} from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----
export interface Skill {
    id: number
    name: string
}


export interface Profile {
    id: string
    username: string
    display_name: string
    bio: string
    picture_url: string
    title: string
    location_text: string
    is_visible: boolean
    show_initials_only: boolean
    mentorship_mode: 'MENTOR' | 'MENTEE' | 'BOTH'
    created_at: string
    updated_at: string
}

export interface UpdateProfileBody {
    display_name?: string
    bio?: string
    title?: string
    location?: string
    is_visible?: boolean
    show_initials_only?: boolean
    skills?: Skill[]
}

// ---- Fetcher ----

async function fetchProfile(username: string): Promise<Profile> {
    const token = localStorage.getItem('access_token')

    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

async function patchProfile(username: string, body: UpdateProfileBody): Promise<Profile> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to update profile')
    return res.json()
}

// ---- Query Options (for loaders) ----

export const profileQueryOptions = (username: string) =>
    queryOptions({
        queryKey: ['profiles', username],
        queryFn: () => fetchProfile(username),
        staleTime: 5 * 60 * 1000,
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

// ---- Custom Hook ----

export function useProfile(username: string) {
    return useQuery(profileQueryOptions(username));
}

export function useUpdateProfile(username: string) {
    return useMutation({
        mutationFn: (body: UpdateProfileBody) => patchProfile(username, body),
    })
}