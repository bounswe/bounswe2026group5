import { useMessageQueue } from '#/hooks/useMessageQueue'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import {
    useConversations,
    useMarkRead,
    useMessages,
    useSendMessage,
    type Conversation,
    type Message,
} from '#/lib/queries/MessagingQueries.ts'
import { useMarkAllNotificationsRead, useNotifications } from '#/lib/queries/NotificationQueries.ts'
import { cn, getInitials } from '#/lib/utils.ts'
import { Button } from '@/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, CheckCheck, Loader2, MessageSquare, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react'

export const Route = createFileRoute('/_authorized/messages')({
    component: MessagesPage,
    validateSearch: (search: Record<string, unknown>) => ({
        conversationId: (search.conversationId as string) ?? '',
    }),
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MessagesPage() {
    const { conversationId } = Route.useSearch()
    const navigate = Route.useNavigate()
    const [selectedId, setSelectedId] = useState<string | null>(conversationId || null)

    const handleSelect = (id: string) => {
        setSelectedId(id)
        navigate({ search: { conversationId: id } })
    }

    const { data: notifications = [] } = useNotifications()
    const { mutate: markAllRead } = useMarkAllNotificationsRead()

    const pendingMsgIdsRef = useRef<string[]>([])
    useEffect(() => {
        pendingMsgIdsRef.current = notifications
            .filter(n => n.type === 'new_message')
            .map(n => n.id)
    }, [notifications])

    useEffect(() => {
        return () => {
            if (pendingMsgIdsRef.current.length > 0) {
                markAllRead(pendingMsgIdsRef.current)
            }
        }
    }, [markAllRead])

    return (
        <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)]">
            <div className="flex h-full rounded-xl border border-line overflow-hidden shadow-sm bg-background max-w-5xl mx-auto">
                <ConversationList selectedId={selectedId} onSelect={handleSelect} />
                <MessageThread conversationId={selectedId} />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Conversation List (left pane)
// ---------------------------------------------------------------------------

function ConversationList({
    selectedId,
    onSelect,
}: {
    readonly selectedId: string | null
    readonly onSelect: (id: string) => void
}) {
    const { data: me } = useQuery(meQueryOptions)
    const { data: conversations = [], isLoading } = useConversations()

    return (
        <aside className="w-72 shrink-0 border-r border-line flex flex-col">
            <div className="px-4 py-4 border-b border-line">
                <h2 className="text-sm font-semibold text-ink">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                    </div>
                ) : conversations.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-ink-soft text-center">
                        No conversations yet.
                    </p>
                ) : (
                    conversations.map(conv => (
                        <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            myUsername={me?.username ?? ''}
                            isSelected={conv.id === selectedId}
                            onSelect={() => onSelect(conv.id)}
                        />
                    ))
                )}
            </div>
        </aside>
    )
}

function ConversationItem({
    conversation,
    myUsername,
    isSelected,
    onSelect,
}: {
    readonly conversation: Conversation
    readonly myUsername: string
    readonly isSelected: boolean
    readonly onSelect: () => void
}) {
    const other =
        conversation.mentor.username === myUsername
            ? conversation.mentee
            : conversation.mentor

    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-muted/60',
                isSelected && 'bg-accent-muted',
            )}
        >
            <Avatar name={other.display_name} pictureUrl={other.picture_url} size="md" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{other.display_name}</p>
                <p className="text-xs text-ink-soft truncate">@{other.username}</p>
            </div>
            {conversation.unread_count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-sm">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </span>
            )}
        </button>
    )
}

// ---------------------------------------------------------------------------
// Message Thread (right pane)
// ---------------------------------------------------------------------------

function MessageThread({ conversationId }: { readonly conversationId: string | null }) {
    if (!conversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-soft">
                <MessageSquare className="h-10 w-10 opacity-30" />
                <p className="text-sm">Select a conversation to start messaging</p>
            </div>
        )
    }

    return <Thread conversationId={conversationId} />
}

function Thread({ conversationId }: { readonly conversationId: string }) {
    const { data: me } = useQuery(meQueryOptions)
    const { data: messages = [], isLoading, loadMore, hasMore } = useMessages(conversationId)
    const { mutate: markRead } = useMarkRead(conversationId)
    const sendMessage = useSendMessage(conversationId)
    const queryClient = useQueryClient()
    const { enqueueMessage, updateMessageStatus, dequeueMessage } = useMessageQueue(conversationId)
    const [text, setText] = useState('')

    // Mark conversation as read when opening
    useEffect(() => {
        if (conversationId) {
            markRead()
        }
    }, [conversationId, markRead])
    
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)

    // Handle auto-scroll to bottom
    useEffect(() => {
        if (isAtBottom) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isAtBottom])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const atTop = target.scrollTop === 0
        const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100
        
        setIsAtBottom(atBottom)

        if (atTop && hasMore && !isLoading) {
            // Store height to maintain scroll position after loading
            const oldHeight = target.scrollHeight
            loadMore()
            
            // Adjust scroll position after render
            requestAnimationFrame(() => {
                if (target) {
                    target.scrollTop = target.scrollHeight - oldHeight
                }
            })
        }
    }

    const handleSubmit = useCallback(
        async (e: SyntheticEvent) => {
            e.preventDefault()
            const body = text.trim()
            if (!body || sendMessage.isPending) return

            setIsAtBottom(true) // Force scroll to bottom for new message
            const queuedMsg = enqueueMessage(body)
            setText('')

            try {
                updateMessageStatus(queuedMsg.tempId, 'sending')
                await sendMessage.mutateAsync(body)
                dequeueMessage(queuedMsg.tempId)
                queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', conversationId] })
            } catch (error) {
                updateMessageStatus(queuedMsg.tempId, 'failed', error instanceof Error ? error.message : 'Failed to send')
                console.error('[Messages] Error sending message:', error)
            }
        },
        [text, sendMessage, enqueueMessage, updateMessageStatus, dequeueMessage, queryClient, conversationId],
    )

    return (
        <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3"
            >
                {hasMore && (
                    <div className="flex justify-center py-2">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
                        ) : (
                            <p className="text-[10px] text-ink-soft italic">Scroll up to load more</p>
                        )}
                    </div>
                )}
                
                {isLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                    </div>
                ) : messages.length === 0 ? (
                    <p className="text-sm text-ink-soft text-center mt-10">
                        No messages yet. Say hello!
                    </p>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender.username === me?.username
                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMe={isMe}
                            />
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                className="shrink-0 border-t border-line px-4 py-3 flex items-end gap-2"
            >
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit(e as unknown as SyntheticEvent)
                        }
                    }}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/40 max-h-32 overflow-y-auto"
                />
                <Button
                    type="submit"
                    size="icon"
                    aria-label="Send message"
                    disabled={!text.trim() || sendMessage.isPending}
                    className="rounded-xl bg-accent hover:bg-accent/90 text-white shrink-0"
                >
                    {sendMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Message Bubble with status indicators
// ---------------------------------------------------------------------------

import { ReportMessageDialog } from '@/components/ReportMessageDialog'

function MessageBubble({
    message,
    isMe,
}: {
    readonly message: Message
    readonly isMe: boolean
}) {
    const getStatusIcon = () => {
        const status = message.status_for_me
        if (status === 'read') {
            return <CheckCheck className="h-3 w-3 text-white/80" />
        }
        if (status === 'delivered') {
            return <CheckCheck className="h-3 w-3 text-white/80" />
        }
        if (status === 'sent' || status === 'sending') {
            return <Check className="h-3 w-3 text-white/60" />
        }
        return null
    }

    const isSending = message.status_for_me === 'sending'

    return (
        <div className={cn('flex items-end gap-2 group', isMe && 'flex-row-reverse')}>
            {!isMe && (
                <Avatar
                    name={message.sender.display_name}
                    pictureUrl={message.sender.picture_url}
                    size="sm"
                />
            )}
            <div
                className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 text-sm relative',
                    isMe
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-accent-muted text-ink rounded-bl-sm',
                    isSending && 'opacity-70',
                )}
            >
                <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
                {message.attachment_url && (
                    <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-1 underline text-xs opacity-80"
                    >
                        Attachment
                    </a>
                )}
                <div className={cn('flex items-center gap-1 text-[10px] mt-1', isMe ? 'justify-end' : 'justify-start')}>
                    <time className="opacity-80">
                        {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </time>
                    {isMe && getStatusIcon()}
                </div>
            </div>

            {!isMe && (
                <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                    <ReportMessageDialog
                        messageId={message.id}
                        reportedUsername={message.sender.username}
                    />
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------

function Avatar({
    name,
    pictureUrl,
    size,
}: {
    readonly name: string
    readonly pictureUrl: string | null
    readonly size: 'sm' | 'md'
}) {
    const dim = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
    if (pictureUrl) {
        return (
            <img
                src={pictureUrl}
                alt={name}
                className={cn('rounded-full object-cover shrink-0', dim)}
            />
        )
    }
    return (
        <div
            className={cn(
                'rounded-full bg-accent text-white font-bold flex items-center justify-center shrink-0',
                dim,
            )}
        >
            {getInitials(name)}
        </div>
    )
}
