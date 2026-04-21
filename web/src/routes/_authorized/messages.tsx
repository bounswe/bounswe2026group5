import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import { meQueryOptions } from '#/lib/queries/AuthQueries.ts'
import {
    useConversations,
    useMessages,
    useSendMessage,
    type Conversation,
} from '#/lib/queries/MessagingQueries.ts'
import { useNotifications, useMarkAllNotificationsRead } from '#/lib/queries/NotificationQueries.ts'
import { getInitials } from '#/lib/utils.ts'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { cn } from '#/lib/utils.ts'

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
    const [selectedId, setSelectedId] = useState<string | null>(conversationId || null)

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
                <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
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
    selectedId: string | null
    onSelect: (id: string) => void
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
    conversation: Conversation
    myUsername: string
    isSelected: boolean
    onSelect: () => void
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
        </button>
    )
}

// ---------------------------------------------------------------------------
// Message Thread (right pane)
// ---------------------------------------------------------------------------

function MessageThread({ conversationId }: { conversationId: string | null }) {
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

function Thread({ conversationId }: { conversationId: string }) {
    const { data: me } = useQuery(meQueryOptions)
    const { data: messages = [], isLoading } = useMessages(conversationId)
    const sendMessage = useSendMessage(conversationId)
    const queryClient = useQueryClient()
    const [text, setText] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        const body = text.trim()
        if (!body || sendMessage.isPending) return
        setText('')
        await sendMessage.mutateAsync(body)
        queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', conversationId] })
    }

    return (
        <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                {isLoading ? (
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
                            <div
                                key={msg.id}
                                className={cn('flex items-end gap-2', isMe && 'flex-row-reverse')}
                            >
                                {!isMe && (
                                    <Avatar
                                        name={msg.sender.display_name}
                                        pictureUrl={msg.sender.picture_url}
                                        size="sm"
                                    />
                                )}
                                <div
                                    className={cn(
                                        'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                                        isMe
                                            ? 'bg-accent text-white rounded-br-sm'
                                            : 'bg-accent-muted text-ink rounded-bl-sm',
                                    )}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                    {msg.attachment_url && (
                                        <a
                                            href={msg.attachment_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block mt-1 underline text-xs opacity-80"
                                        >
                                            Attachment
                                        </a>
                                    )}
                                    <time className={cn('block text-[10px] mt-1 opacity-60', isMe ? 'text-right' : '')}>
                                        {new Date(msg.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </time>
                                </div>
                            </div>
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
                            handleSubmit(e as unknown as FormEvent)
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
// Avatar helper
// ---------------------------------------------------------------------------

function Avatar({
    name,
    pictureUrl,
    size,
}: {
    name: string
    pictureUrl: string | null
    size: 'sm' | 'md'
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
