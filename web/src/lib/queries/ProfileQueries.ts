import { queryOptions, useQuery,} from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

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

// ---- Fetcher ----

async function fetchProfile(username: string): Promise<Profile> {
    const token = localStorage.getItem('access_token')

    const res = await fetch(`${API_BASE_URL}/profiles/${username}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

// ---- Query Options (for loaders) ----

export const profileQueryOptions = (username: string) =>
    queryOptions({
        queryKey: ['profiles', username],
        queryFn: () => fetchProfile(username),
        staleTime: 5 * 60 * 1000,
    })

// ---- Custom Hook ----

export function useProfile(username: string) {
    return useQuery(profileQueryOptions(username));
}
