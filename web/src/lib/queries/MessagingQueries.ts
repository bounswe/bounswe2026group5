import { useFirestoreMessages } from '#/hooks/useFirestoreMessages'
import { useMessageQueue } from '#/hooks/useMessageQueue'
import { throwApiError } from '#/lib/apiError.ts'
import { isFirebaseAvailable } from '#/lib/firebase-client'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'

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
    unread_count: number
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

async function sendMessage(
    conversationId: string,
    body: string,
    attachment?: File,
): Promise<Message> {
    const headers = authHeaders()
    let reqBody: BodyInit
    if (attachment) {
        const form = new FormData()
        form.append('body', body)
        form.append('attachment', attachment)
        reqBody = form
    } else {
        (headers as Record<string, string>)['Content-Type'] = 'application/json'
        reqBody = JSON.stringify({ body })
    }
    const res = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
        method: 'POST',
        headers,
        body: reqBody,
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

export const messagesQueryOptions = (conversationId: string, pageSize = 50, forceEnable = false) =>
    queryOptions({
        queryKey: ['messaging', 'messages', conversationId, pageSize],
        queryFn: () => fetchMessages(conversationId, 1, pageSize),
        staleTime: 2000,
        refetchInterval: 2000, // Poll every 2s
        enabled: !!conversationId && (!isFirebaseAvailable() || forceEnable),
    })

// ---- Hooks ----

export function useConversations() {
    return useQuery(conversationsQueryOptions)
}

export function useMessages(conversationId: string) {
    const [pageSize, setPageSize] = useState(50)
    
    const { 
        messages: firebaseMessages, 
        isLoading: fbLoading, 
        isFirebaseAvailable: fbAvailable,
        loadMore: fbLoadMore,
        hasMore: fbHasMore
    } = useFirestoreMessages(conversationId)

    const { data: httpMessages = [], isLoading: httpLoading } = useQuery(
        messagesQueryOptions(conversationId, pageSize, !fbAvailable),
    )
    
    const { queue: queuedMessages } = useMessageQueue(conversationId)

    const mergedMessages = useMemo(() => {
        const remoteMessages = fbAvailable ? firebaseMessages : httpMessages
        const remoteMsgIds = new Set(remoteMessages.map(m => m.id))

        const allMessages = remoteMessages.map(msg => {
            if ('sender_username' in msg) {
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

        const queuedOnlyMessages = queuedMessages
            .filter(q => !remoteMsgIds.has(q.tempId))
            .map(q => ({
                id: q.tempId,
                conversation_id: conversationId,
                sender: { id: 'me', username: 'me', display_name: 'You', picture_url: null, title: null },
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

    const loadMore = useCallback(() => {
        if (fbAvailable) {
            fbLoadMore()
        } else {
            setPageSize(prev => prev + 50)
        }
    }, [fbAvailable, fbLoadMore])

    return {
        data: mergedMessages,
        isLoading: fbAvailable ? fbLoading : httpLoading,
        loadMore,
        hasMore: fbAvailable ? fbHasMore : httpMessages.length >= pageSize
    }
}

export function useSendMessage(conversationId: string) {
    return useMutation({
        mutationFn: ({ body, attachment }: { body: string; attachment?: File }) =>
            sendMessage(conversationId, body, attachment),
    })
}

/**
 * useMarkRead: Minimalist batch marking of a conversation as read with optimistic updates.
 */
export function useMarkRead(conversationId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/mark-read/`, {
                method: 'POST',
                headers: authHeaders(),
            })
            if (!res.ok) await throwApiError(res)
            return res.json()
        },
        onMutate: async () => {
            // Optimistic update: cancel refetches and clear count locally
            await queryClient.cancelQueries({ queryKey: ['messaging', 'conversations'] })
            const previousConversations = queryClient.getQueryData<Conversation[]>(['messaging', 'conversations'])
            
            queryClient.setQueryData<Conversation[]>(['messaging', 'conversations'], (old) => {
                return old?.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
            })

            return { previousConversations }
        },
        onError: (_err, _newVal, context) => {
            // Rollback on error
            if (context?.previousConversations) {
                queryClient.setQueryData(['messaging', 'conversations'], context.previousConversations)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
            queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', conversationId] })
        }
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
