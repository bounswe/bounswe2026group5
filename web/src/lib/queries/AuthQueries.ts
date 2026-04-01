// lib/queries/auth.ts
import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryClient, router } from "#/router.tsx"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface User {
    id: string
    username: string,
    email: string
    role: string
    auth_provider: string
    is_active: boolean
    created_at: string
}

interface AuthResponse {
    access_token: string
    refresh_token: string
    user: User
}

// ---- Query Options ----

export const meQueryOptions = queryOptions({
    queryKey: ['me'],
    queryFn: async () => {
        const token = localStorage.getItem('access_token')
        const id = localStorage.getItem('id')
        if (!token || !id) return null

        const res = await fetch(`${API_BASE_URL}/auth/${id}/`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) return null
        return await res.json() as Promise<User>
    },
    staleTime: 5 * 60 * 1000,
})
// ---- Plain functions ----

export const getStoredUser = (): Partial<User> | null => {
    const token = localStorage.getItem('access_token')
    const id = localStorage.getItem('id')
    if (!token || !id) return null
    return { id }
}

export function handleAuthSuccess(data: AuthResponse) {
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('id', data.user.id)
    queryClient.setQueryData(['me'], data.user)
}

export function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id')
    queryClient.setQueryData(['me'], null)
    router.navigate({ to: '/login' })
}

// ---- API functions (used as mutationFn inside components) ----

export async function loginFn(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })
    if (!res.ok) throw new Error('Invalid credentials')
    return res.json() as Promise<AuthResponse>
}

export async function registerFn(credentials: { email: string; password: string; confirm_password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })
    if (!res.ok) throw new Error('Registration failed')
    return res.json() as Promise<AuthResponse>
}