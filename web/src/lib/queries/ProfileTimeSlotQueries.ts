import { throwApiError } from "#/lib/apiError.ts"
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface AvailabilitySlot {
    id: string
    date: string
    startTime: string
    endTime: string
    is_booked: boolean
    bookedBy: string | null
    bookedAt: string | null
    sessionId: string | null
    created_at: string
    updated_at: string
    status: 'AVAILABLE' | 'PENDING' | 'BOOKED'
}

export interface CreateSlotBody {
    date: string       // "2026-04-03"
    startTime: string  // "10:00"
    endTime: string    // "10:30"
}

// ---- Fetchers ----

async function bookSlot(username: string, slotId: string, message?: string): Promise<AvailabilitySlot> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/availability-slots/${slotId}/book/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message }),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function createSlot(body: CreateSlotBody): Promise<AvailabilitySlot> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/availability-slots/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function deleteSlot(slotId: string): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/availability-slots/${slotId}/`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res)
}

// ---- Hooks ----

export function useBookSlot(username: string) {
    return useMutation({
        mutationFn: ({ slotId, message }: { slotId: string; message?: string }) =>
            bookSlot(username, slotId, message),
    })
}

export function useCreateSlot(_username: string) {
    return useMutation({
        mutationFn: (body: CreateSlotBody) => createSlot(body),
    })
}

export function useDeleteSlot(_username: string) {
    return useMutation({
        mutationFn: (slotId: string) => deleteSlot(slotId),
    })
}

// to be deleted later maybe
export const availabilitySlotsQueryOptions = (username: string) =>
    queryOptions({
        queryKey: ['availability-slots', username],
        queryFn: async () => {
            const token = localStorage.getItem('access_token')
            const res = await fetch(`${API_BASE_URL}/profiles/${username}/availability-slots/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) await throwApiError(res)
            return res.json() as Promise<AvailabilitySlot[]>
        },
        staleTime: 60 * 1000,
        gcTime: Infinity,
    })

export function useAvailabilitySlots(username: string, enabled: boolean = true) {
    return useQuery({
        ...availabilitySlotsQueryOptions(username),
        enabled
    })
}