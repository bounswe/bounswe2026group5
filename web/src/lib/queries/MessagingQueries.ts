import { useFirestoreMessages } from '#/hooks/useFirestoreMessages'
import { useMessageQueue } from '#/hooks/useMessageQueue'
import { throwApiError } from '#/lib/apiError.ts'
import { isFirebaseAvailable } from '#/lib/firebase-client'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

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
    read_receipts?: Record<string, string>
    status_for_me?: 'sent' | 'delivered' | 'read'
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
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function fetchMessages(conversationId: string, page = 1, pageSize = 50): Promise<Message[]> {
    const res = await fetch(
        `${API_BASE_URL}/messages/conversations/${conversationId}/?page=${page}&pageSize=${pageSize}`,
        { headers: authHeaders() },
    )
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function sendMessage(conversationId: string, body: string): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

async function markMessageRead(messageId: string): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/messages/${messageId}/mark-read/`, {
        method: 'POST',
        headers: authHeaders(),
    })
    if (!res.ok) await throwApiError(res)
    return res.json()
}

// ---- Query Options ----

export const conversationsQueryOptions = queryOptions({
    queryKey: ['messaging', 'conversations'],
    queryFn: fetchConversations,
    staleTime: 30 * 1000,
})

export const messagesQueryOptions = (conversationId: string, forceEnable = false) =>
    queryOptions({
        queryKey: ['messaging', 'messages', conversationId],
        queryFn: () => fetchMessages(conversationId),
        staleTime: 2000,
        refetchInterval: 2000, // Poll every 2s
        enabled: !!conversationId && (!isFirebaseAvailable() || forceEnable),
    })

// ---- Hooks ----

export function useConversations() {
    return useQuery(conversationsQueryOptions)
}

/**
 * Hook for fetching messages with Firestore real-time updates and HTTP fallback.
 * 
 * Priority:
 * 1. If Firebase is available: uses real-time Firestore listener (primary)
 * 2. If Firebase is unavailable: falls back to HTTP polling (5s interval)
 * 
 * Merges offline-queued messages with remote messages to provide seamless offline support.
 */
export function useMessages(conversationId: string) {
    const { messages: firebaseMessages, isLoading: fbLoading, isFirebaseAvailable: fbAvailable } = useFirestoreMessages(conversationId)
    const { data: httpMessages = [], isLoading: httpLoading } = useQuery(
        messagesQueryOptions(conversationId, !fbAvailable),
    )
    const { queue: queuedMessages } = useMessageQueue(conversationId)

    // Debug logging for transport layer
    if (fbAvailable && firebaseMessages.length > 0) {
        console.debug(`[Messaging] Using Firestore (${firebaseMessages.length} messages)`)
    } else if (!fbAvailable && httpMessages.length > 0) {
        console.debug(`[Messaging] Using HTTP polling fallback (${httpMessages.length} messages)`)
    }

    // Determine primary source and merge messages
    const mergedMessages = useMemo(() => {
        // Use Firebase messages if available, otherwise use HTTP
        const remoteMessages = fbAvailable ? firebaseMessages : httpMessages

        // Create a map of remote message IDs for deduplication
        const remoteMsgIds = new Set(remoteMessages.map(m => m.id))

        // Convert Firebase messages to our Message interface if needed
        const allMessages = remoteMessages.map(msg => {
            if ('sender_username' in msg) {
                // It's a Firebase message, convert to Message interface
                const status = (msg.read_receipts?.[msg.sender_id] || 'sent') as 'sent' | 'delivered' | 'read'
                return {
                    id: msg.id,
                    conversation_id: conversationId,
                    sender: {
                        id: msg.sender_id,
                        username: msg.sender_username,
                        display_name: msg.sender_display_name,
                        picture_url: msg.sender_picture_url,
                        title: null,
                    },
                    body: msg.body,
                    attachment_url: msg.attachment_url,
                    created_at: msg.created_at,
                    read_receipts: msg.read_receipts,
                    status_for_me: status,
                } as Message
            }
            return msg
        }) as Message[]

        // Add queued messages that aren't already sent
        const queuedOnlyMessages = queuedMessages
            .filter(q => !remoteMsgIds.has(q.tempId))
            .map(q => ({
                id: q.tempId,
                conversation_id: conversationId,
                sender: {
                    id: 'me',
                    username: 'me',
                    display_name: 'You',
                    picture_url: null,
                    title: null,
                },
                body: q.body,
                attachment_url: q.attachmentUrl,
                created_at: new Date(q.timestamp).toISOString(),
                read_receipts: {},
                status_for_me: q.status as 'sent' | 'delivered' | 'read',
            } as Message))

        return [...allMessages, ...queuedOnlyMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
    }, [fbAvailable, firebaseMessages, httpMessages, queuedMessages, conversationId])

    return {
        data: mergedMessages,
        isLoading: fbAvailable ? fbLoading : httpLoading,
    }
}

export function useSendMessage(conversationId: string) {
    return useMutation({
        mutationFn: (body: string) => sendMessage(conversationId, body),
    })
}

export function useMarkMessageRead(messageId: string) {
    return useMutation({
        mutationFn: () => markMessageRead(messageId),
    })
}

export function useMessaging() {
    const navigate = useNavigate()
    const { data: conversations = [] } = useConversations()
    const { data: me } = useQuery(meQueryOptions)

    const matchedUsernames = useMemo(() => {
        const myUsername = me?.username
        return new Set(
            conversations
                .flatMap(c => [c.mentor.username, c.mentee.username])
                .filter(u => u !== myUsername),
        )
    }, [conversations, me?.username])

    const sendMessageTo = useCallback((username: string) => {
        const conv = conversations.find(
            c => c.mentor.username === username || c.mentee.username === username,
        )
        navigate({ to: '/messages', search: { conversationId: conv?.id ?? '' } })
    }, [navigate, conversations])

    return { matchedUsernames, sendMessageTo }
}
