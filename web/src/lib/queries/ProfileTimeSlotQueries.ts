import { profileQueryOptions } from "#/lib/queries/ProfileQueries.ts";
import { queryOptions, useMutation, useQueries, useQuery } from "@tanstack/react-query";

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

export function useMentorUpcomingSessions(username: string) {
    const { data: allSlots = [], isLoading: slotsLoading } = useAvailabilitySlots(username)

    console.log('allSlots:', allSlots)
    console.log('username:', username)

    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const upcomingBookedSlots = allSlots
        .filter(slot => {
            if (!slot.is_booked || !slot.bookedBy) return false
            const slotDateTime = new Date(`${slot.date}T${slot.startTime}`)
            return slotDateTime >= new Date() && slotDateTime <= in7Days
        })
        .sort((a, b) => a.date.localeCompare(b.date))

    console.log('upcomingBookedSlots:', upcomingBookedSlots)
    const uniqueMenteeUsernames = [...new Set(
        upcomingBookedSlots.map(s => s.bookedBy).filter(Boolean) as string[]
    )]

    const profileQueries = useQueries({
        queries: uniqueMenteeUsernames.map(u => ({
            ...profileQueryOptions(u),
            enabled: !!u,
        })),
    })

    const profilesByUsername: Record<string, any> = Object.fromEntries(
        profileQueries
            .map((q, i) => [uniqueMenteeUsernames[i], q.data])
            .filter(([, data]) => !!data)
    )

    return {
        sessions: upcomingBookedSlots,
        profilesByUsername,
        isLoading: slotsLoading || profileQueries.some(q => q.isLoading),
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