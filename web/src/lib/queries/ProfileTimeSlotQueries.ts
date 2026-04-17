import { useMeetingSessions } from "#/lib/queries/MentorshipQueries.ts";
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
    created_at: string
    updated_at: string
    status?: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED' | 'COMPLETED'
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
    if (!res.ok) throw new Error('Booking failed')
    return res.json()
}

async function createSlot(body: CreateSlotBody): Promise<AvailabilitySlot> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/availability-slots/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to create slot')
    return res.json()
}

async function deleteSlot(slotId: string): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/me/availability-slots/${slotId}/`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to delete slot')
}

async function cancelBooking(username: string, slotId: string): Promise<void> {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/profiles/${username}/availability-slots/${slotId}/cancel-booking/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error('Failed to cancel booking')
}

function pad2(value: number): string {
    return String(value).padStart(2, '0')
}

function toLocalDate(value: string): string {
    const date = new Date(value)
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function toLocalTime(value: string): string {
    const date = new Date(value)
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
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

export function useCancelBooking(username: string) {
    return useMutation({
        mutationFn: (slotId: string) => cancelBooking(username, slotId),
    })
}

export function useMentorUpcomingSessions(_username: string) {
    const { data: sessions = [], isLoading } = useMeetingSessions({
        role: 'mentor',
        status: 'upcoming',
    })

    const normalizedSessions: AvailabilitySlot[] = sessions.map((session) => ({
        id: session.source_slot_id ?? session.session_id,
        date: toLocalDate(session.scheduled_start_at),
        startTime: toLocalTime(session.scheduled_start_at),
        endTime: toLocalTime(session.scheduled_end_at),
        is_booked: true,
        bookedBy: session.mentee.username,
        bookedAt: session.created_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        status: session.display_status,
    }))

    const profilesByUsername: Record<string, {
        username: string
        full_name: string
        display_name: string
        picture_url: string
        title: string
    }> = Object.fromEntries(
        sessions.map((session) => [
            session.mentee.username,
            {
                username: session.mentee.username,
                full_name: session.mentee.display_name,
                display_name: session.mentee.display_name,
                picture_url: session.mentee.picture_url,
                title: session.mentee.title,
            },
        ]),
    )

    return {
        sessions: normalizedSessions,
        profilesByUsername,
        isLoading,
    }
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
            if (!res.ok) throw new Error(`${res.status}`)
            return res.json() as Promise<AvailabilitySlot[]>
        },
        staleTime: 60 * 1000,
        gcTime: Infinity,
    })

export function useAvailabilitySlots(username: string) {
    return useQuery(availabilitySlotsQueryOptions(username))
}