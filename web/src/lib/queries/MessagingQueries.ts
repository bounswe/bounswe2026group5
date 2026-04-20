import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ---- Types ----

export interface ProfileSummary {
    id: string
    username: string
    display_name: string
    picture_url: string | null
    title: string | null
}

export interface Conversation {
    id: string
    match_id: string
    mentor: ProfileSummary
    mentee: ProfileSummary
    created_at: string
    updated_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender: ProfileSummary
    body: string
    attachment_url: string | null
    created_at: string
}

// ---- Helpers ----

function authHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---- Fetchers ----

async function fetchConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE_URL}/messages/conversations/`, {
        headers: authHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch conversations')
    return res.json()
}

async function fetchMessages(conversationId: string, page = 1, pageSize = 50): Promise<Message[]> {
    const res = await fetch(
        `${API_BASE_URL}/messages/conversations/${conversationId}/?page=${page}&pageSize=${pageSize}`,
        { headers: authHeaders() },
    )
    if (!res.ok) throw new Error('Failed to fetch messages')
    return res.json()
}

async function sendMessage(conversationId: string, body: string): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
    })
    if (!res.ok) throw new Error('Failed to send message')
    return res.json()
}

// ---- Query Options ----

export const conversationsQueryOptions = queryOptions({
    queryKey: ['messaging', 'conversations'],
    queryFn: fetchConversations,
    staleTime: 30 * 1000,
})

export const messagesQueryOptions = (conversationId: string) =>
    queryOptions({
        queryKey: ['messaging', 'messages', conversationId],
        queryFn: () => fetchMessages(conversationId),
        staleTime: 2000,
        refetchInterval: 2000,
        enabled: !!conversationId,
    })

// ---- Hooks ----

export function useConversations() {
    return useQuery(conversationsQueryOptions)
}

export function useMessages(conversationId: string) {
    return useQuery(messagesQueryOptions(conversationId))
}

export function useSendMessage(conversationId: string) {
    return useMutation({
        mutationFn: (body: string) => sendMessage(conversationId, body),
    })
}
