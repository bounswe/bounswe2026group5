// lib/queries/auth.ts
import { queryClient, router } from "#/router.tsx"
import { throwApiError } from "#/lib/apiError.ts"
import { queryOptions, useMutation } from "@tanstack/react-query"
import { signInWithFirebase } from "#/lib/firebase-client"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface User {
    id: string
    username: string,
    email: string
    role: string
    auth_provider: string
    app_usage_mode: "MENTEE" | "MENTOR" | "ADMIN"
    is_active: boolean
    is_email_verified: boolean
    created_at: string
}

interface AuthResponse {
    access_token: string
    refresh_token: string
    firebase_token?: string
    user: User
}

// ---- Query Options ----

export const meQueryOptions = queryOptions({
    queryKey: ['me'],
    queryFn: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) return null

        let res = await fetch(`${API_BASE_URL}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        // Try to refresh if expired
        if (res.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token')
            if (!refreshToken) return null

            const refreshRes = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            })

            if (!refreshRes.ok) {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                localStorage.removeItem('id')
                queryClient.clear()
                router.navigate({ to: '/login' })
                return null
            }

            const { access } = await refreshRes.json()
            localStorage.setItem('access_token', access)

            // Retry original request with new token
            res = await fetch(`${API_BASE_URL}/auth/me/`, {
                headers: { Authorization: `Bearer ${access}` }
            })
        }

        if (!res.ok) return null
        const data = await res.json() as User & { firebase_token?: string }
        
        // If a firebase token is returned in the me response, sign in
        if (data.firebase_token) {
            signInWithFirebase(data.firebase_token)
        }
        
        return data as User
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
})
// ---- Plain functions ----

export const getStoredUser = (): Partial<User> | null => {
    const token = localStorage.getItem('access_token')
    const id = localStorage.getItem('id')
    if (!token) return null
    return id ? { id } : {}
}

export function handleAuthSuccess(data: AuthResponse) {
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('id', data.user.id)
    queryClient.setQueryData(['me'], data.user)
    
    if (data.firebase_token) {
        signInWithFirebase(data.firebase_token)
    }
}

export async function logout() {
    const refreshToken = localStorage.getItem('refresh_token')

    // Blacklist the refresh token on the backend
    if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {}) // ignore errors, proceed with local logout anyway
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id')
    queryClient.clear()
    router.navigate({ to: '/login' })
}

// ---- API functions (used as mutationFn inside components) ----

export async function loginFn(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<AuthResponse>
}

export async function registerFn(credentials: { email: string; password: string; confirm_password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<AuthResponse>
}

export async function googleLoginFn(idToken: string) {
    const res = await fetch(`${API_BASE_URL}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
    })
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<AuthResponse>
}

export async function updateAppUsageModeFn({ app_usage_mode }: {
    userId?: string
    app_usage_mode: 'MENTEE' | 'MENTOR'
}) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/auth/me/role/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ app_usage_mode }),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export function useUpdateAppUsageMode() {
    return useMutation({
        mutationFn: updateAppUsageModeFn,
    })
}

export async function forgotPasswordFn(data: { email: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    // Always swallow errors — generic response to prevent account enumeration
    if (!res.ok && res.status !== 400) await throwApiError(res)
}

export async function resetPasswordFn(data: { token: string; new_password: string; confirm_password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res)
}

export async function verifyEmailFn(token: string) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-email/?token=${encodeURIComponent(token)}`)
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export async function resendVerificationEmailFn() {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/auth/resend-verification/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

export function clearAuthState() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id')
    queryClient.clear()
}