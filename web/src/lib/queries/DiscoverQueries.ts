import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface PublicMentorProfile {
    id: string
    username: string
    full_name: string
    bio: string
    hidden: boolean
    picture_url: string | null
    title: string
    location: string | null
    show_initials_only: boolean
    expertises: string[]
    rating: number
    total_mentee_count: number
}

export interface MentorSearchResponse {
    count: number
    page: number
    pageSize: number
    results: PublicMentorProfile[]
}

export interface MentorSearchParams {
    q?: string
    skills?: string[]
    pageSize?: number
}

export interface Skill {
    id: number
    name: string
}

export async function fetchMentors(
    params: MentorSearchParams & { page: number }
): Promise<MentorSearchResponse> {
    const url = new URL(`${API_BASE_URL}/profiles/`, window.location.origin)

    if (params.q)              url.searchParams.set('q', params.q)
    if (params.page)           url.searchParams.set('page', String(params.page))
    if (params.pageSize)       url.searchParams.set('pageSize', String(params.pageSize))
    if (params.skills?.length) params.skills.forEach(s => url.searchParams.append('skill', s))

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error('Failed to fetch mentors')
    return res.json()
}

export async function fetchAllSkills(): Promise<Skill[]> {
    const res = await fetch(`${API_BASE_URL}/profiles/skills/`)
    if (!res.ok) throw new Error('Failed to fetch skills')
    return res.json()
}

export const mentorSearchInfiniteQueryOptions = (params: MentorSearchParams) =>
    infiniteQueryOptions({
        queryKey: ['mentors', 'search', params],
        queryFn: ({ pageParam }) =>
            fetchMentors({ ...params, page: pageParam as number }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const fetched = lastPage.page * lastPage.pageSize
            return fetched < lastPage.count ? lastPage.page + 1 : undefined
        },
    })

export const allSkillsQueryOptions = queryOptions({
    queryKey: ['profiles', 'skills'],
    queryFn: fetchAllSkills,
    staleTime: Infinity,
})