import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
    Users, ChevronLeft, Pencil, Plus, Trophy, TrendingUp,
    Trash2, Loader2, Lock, User, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Display, Muted } from '@/components/Typography'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MediaUploadField } from '@/components/MediaUploadField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    communityDetailQueryOptions,
    communityMembersQueryOptions,
    useJoinCommunityMutation,
    useLeaveCommunityMutation,
    useUpdateCommunityDescriptionMutation,
    useInfiniteCommunityPosts,
    useCreateCommunityPost,
    useEditCommunityPost,
    useDeleteCommunityPost,
    useTaggableUsers,
    type CommunityPost,
    type CommunityPostCreatePayload,
    type CommunityPostUpdatePayload,
} from '@/lib/queries/CommunityQueries.ts'
import { meQueryOptions } from '@/lib/queries/AuthQueries.ts'
import { useMessaging } from '@/lib/queries/MessagingQueries.ts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PublicMentorProfile } from '@/lib/queries/DiscoverQueries.ts'

function mediaFileName(url: string): string {
    const raw = url.split('/').pop()?.split('?')[0] ?? 'media'
    return /^[a-f0-9]{32}_/.test(raw) ? raw.slice(33) : raw
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
]

const EVENT_TYPE_META = {
    achievement: { label: 'Achievement', Icon: Trophy, className: 'bg-amber-100 text-amber-700 border-amber-200' },
    social: { label: 'Social', Icon: Users, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    progress: { label: 'Progress', Icon: TrendingUp, className: 'bg-green-100 text-green-700 border-green-200' },
} as const

function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Shared avatar (used for both members and posts)
// ---------------------------------------------------------------------------

function UserAvatar({
    displayName,
    pictureUrl,
    size = 'md',
}: {
    displayName: string
    pictureUrl: string | null
    size?: 'sm' | 'md'
}) {
    const initials = (displayName || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    const colorClass = AVATAR_COLORS[displayName.length % AVATAR_COLORS.length]
    const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'

    if (pictureUrl) {
        return (
            <img
                src={pictureUrl}
                alt={displayName}
                className={cn('rounded-full object-cover shrink-0 border border-line', dim)}
            />
        )
    }
    return (
        <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border border-white/50', colorClass, dim)}>
            {initials}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Member card (compact sidebar strip)
// ---------------------------------------------------------------------------

function MemberCard({
    profile,
    onViewProfile,
    onSendMessage,
}: {
    profile: PublicMentorProfile
    onViewProfile: (username: string) => void
    onSendMessage?: (username: string) => void
}) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-alt transition-colors">
            <UserAvatar displayName={profile.full_name} pictureUrl={profile.picture_url} size="sm" />
            <span className="text-sm font-medium text-ink truncate flex-1">{profile.full_name}</span>
            <div className="flex items-center gap-0.5 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-ink-soft hover:text-accent"
                    onClick={() => onViewProfile(profile.username)}
                    aria-label="View profile"
                >
                    <User className="h-3.5 w-3.5" />
                </Button>
                {onSendMessage && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-ink-soft hover:text-accent"
                        onClick={() => onSendMessage(profile.username)}
                        aria-label="Send message"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Community post card (real-post style)
// ---------------------------------------------------------------------------

function CommunityPostCard({
    post,
    isOwn,
    onEdit,
    onDelete,
}: {
    post: CommunityPost
    isOwn: boolean
    onEdit: (p: CommunityPost) => void
    onDelete: (p: CommunityPost) => void
}) {
    const { Icon, label, className } = EVENT_TYPE_META[post.event_type]

    return (
        <div className="rounded-lg border border-line bg-white dark:bg-white/5 px-5 py-4 flex flex-col gap-3 hover:border-accent/40 transition-colors">

            {/* Header: avatar + author info + actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <UserAvatar displayName={post.author.display_name} pictureUrl={post.author.picture_url} />
                    <div className="flex flex-col min-w-0">
                        <Link
                            to="/profiles/$username"
                            params={{ username: post.author.username }}
                            className="text-sm font-semibold text-ink hover:underline leading-snug"
                        >
                            {post.author.display_name}
                        </Link>
                        <Muted className="text-xs">
                            @{post.author.username}{post.author.title ? ` · ${post.author.title}` : ''}
                        </Muted>
                        <Muted className="text-xs">{formatTimestamp(post.timestamp)}</Muted>
                    </div>
                </div>

                {isOwn && (
                    <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-ink-soft hover:text-ink" onClick={() => onEdit(post)} aria-label="Edit post">
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-ink-soft hover:text-red-500" onClick={() => onDelete(post)} aria-label="Delete post">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Event type badge */}
            <span className={`self-start inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
                <Icon className="w-3 h-3" />
                {label}
            </span>

            {post.content && (
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.content}</p>
            )}

            {post.tagged_users.length > 0 && (
                <Muted className="text-xs">
                    with{' '}
                    {post.tagged_users.map((u, i) => (
                        <span key={u.user_id}>
                            <Link to="/profiles/$username" params={{ username: u.username }} className="text-accent hover:underline">
                                @{u.username}
                            </Link>
                            {i < post.tagged_users.length - 1 && ', '}
                        </span>
                    ))}
                </Muted>
            )}

            {post.media_url && (
                <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline truncate">
                    {mediaFileName(post.media_url)}
                </a>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Taggable users checklist
// ---------------------------------------------------------------------------

function TaggableUsersList({
    communityId,
    selected,
    onChange,
}: {
    communityId: string
    selected: string[]
    onChange: (usernames: string[]) => void
}) {
    const { data: taggable = [], isLoading } = useTaggableUsers(communityId)

    if (isLoading) return <p className="text-xs text-ink-soft">Loading…</p>
    if (taggable.length === 0) return <p className="text-xs text-ink-soft">No taggable users in this community.</p>

    return (
        <div className="border border-line rounded-md max-h-40 overflow-y-auto divide-y divide-line">
            {taggable.map((user) => {
                const checked = selected.includes(user.username)
                const maxReached = !checked && selected.length >= 5
                return (
                    <label
                        key={user.username}
                        className={cn(
                            'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer',
                            maxReached ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-alt',
                        )}
                    >
                        <Checkbox
                            checked={checked}
                            disabled={maxReached}
                            onCheckedChange={(v) => {
                                if (v) onChange([...selected, user.username])
                                else onChange(selected.filter((u) => u !== user.username))
                            }}
                        />
                        <span>
                            {user.display_name}{' '}
                            <span className="text-ink-soft">@{user.username}</span>
                        </span>
                    </label>
                )
            })}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Create Post Dialog
// ---------------------------------------------------------------------------

function CreatePostDialog({
    communityId,
    open,
    onOpenChange,
}: {
    communityId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const createMutation = useCreateCommunityPost(communityId)
    const [form, setForm] = useState<CommunityPostCreatePayload>({
        event_type: 'achievement',
        content: '',
        media_url: '',
        show_on_profile: false,
        tagged_users: [],
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.content.trim()) return
        const payload: CommunityPostCreatePayload = {
            event_type: form.event_type,
            content: form.content.trim(),
            show_on_profile: form.show_on_profile,
            tagged_users: form.tagged_users,
            ...((form.media_url as string)?.trim() ? { media_url: (form.media_url as string).trim() } : {}),
        }
        createMutation.mutate(payload, {
            onSuccess: () => {
                toast.success('Post published')
                setForm({ event_type: 'achievement', content: '', media_url: '', show_on_profile: false, tagged_users: [] })
                onOpenChange(false)
            },
            onError: () => toast.error('Failed to publish post. Please try again.'),
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_create_type">Type</Label>
                        <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v as CommunityPostCreatePayload['event_type'] }))}>
                            <SelectTrigger id="cop_create_type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="achievement">Achievement</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="progress">Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_create_content">Content <span className="text-red-500">*</span></Label>
                        <Textarea id="cop_create_content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Share something with this community…" maxLength={2000} rows={4} required />
                        <p className="text-xs text-ink-soft text-right">{form.content.length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Tag people <span className="text-ink-soft text-xs">(max 5)</span></Label>
                        <TaggableUsersList communityId={communityId} selected={form.tagged_users ?? []} onChange={(usernames) => setForm((f) => ({ ...f, tagged_users: usernames }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Media (optional)</Label>
                        <MediaUploadField onUrl={url => setForm(f => ({ ...f, media_url: url ?? undefined }))} />
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox checked={form.show_on_profile} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_profile: Boolean(v) }))} />
                        Share to my profile
                    </label>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!form.content.trim() || createMutation.isPending} className="bg-accent hover:bg-accent/90 text-white">
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Edit Post Dialog
// ---------------------------------------------------------------------------

function EditPostDialog({
    communityId,
    post,
    open,
    onOpenChange,
}: {
    communityId: string
    post: CommunityPost
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const editMutation = useEditCommunityPost(communityId)
    const [form, setForm] = useState<CommunityPostUpdatePayload>({
        event_type: post.event_type,
        content: post.content,
        media_url: post.media_url ?? '',
        show_on_profile: post.show_on_profile,
        tagged_users: post.tagged_users.map((u) => u.username),
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload: CommunityPostUpdatePayload = {
            event_type: form.event_type,
            content: (form.content ?? '').trim(),
            media_url: (form.media_url as string)?.trim() || null,
            show_on_profile: form.show_on_profile,
            tagged_users: form.tagged_users,
        }
        editMutation.mutate({ postId: post.id, payload }, {
            onSuccess: () => { toast.success('Post updated'); onOpenChange(false) },
            onError: () => toast.error('Failed to update post. Please try again.'),
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_edit_type">Type</Label>
                        <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v as CommunityPostUpdatePayload['event_type'] }))}>
                            <SelectTrigger id="cop_edit_type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="achievement">Achievement</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="progress">Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_edit_content">Content <span className="text-red-500">*</span></Label>
                        <Textarea id="cop_edit_content" value={form.content ?? ''} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Share something with this community…" maxLength={2000} rows={4} required />
                        <p className="text-xs text-ink-soft text-right">{(form.content ?? '').length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Tag people <span className="text-ink-soft text-xs">(max 5)</span></Label>
                        <TaggableUsersList communityId={communityId} selected={form.tagged_users ?? []} onChange={(usernames) => setForm((f) => ({ ...f, tagged_users: usernames }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Media (optional)</Label>
                        <MediaUploadField currentUrl={post.media_url} onUrl={url => setForm(f => ({ ...f, media_url: url ?? undefined }))} />
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox checked={form.show_on_profile} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_profile: Boolean(v) }))} />
                        Share to my profile
                    </label>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!form.content?.trim() || editMutation.isPending} className="bg-accent hover:bg-accent/90 text-white">
                            {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Delete Confirm Dialog
// ---------------------------------------------------------------------------

function DeletePostDialog({
    communityId,
    post,
    open,
    onOpenChange,
}: {
    communityId: string
    post: CommunityPost
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const deleteMutation = useDeleteCommunityPost(communityId)

    function handleConfirm() {
        deleteMutation.mutate(post.id, {
            onSuccess: () => { toast.success('Post deleted'); onOpenChange(false) },
            onError: () => toast.error('Failed to delete post. Please try again.'),
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Delete Post</DialogTitle></DialogHeader>
                <p className="text-sm text-ink-soft mt-1">
                    Are you sure you want to delete this post? This action cannot be undone.
                </p>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" disabled={deleteMutation.isPending} onClick={handleConfirm}>
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Edit Description Modal
// ---------------------------------------------------------------------------

function EditDescriptionModal({
    open,
    currentDescription,
    communitySlug,
    onClose,
    updateMutation,
}: {
    open: boolean
    currentDescription: string
    communitySlug: string
    onClose: () => void
    updateMutation: ReturnType<typeof useUpdateCommunityDescriptionMutation>
}) {
    const [description, setDescription] = useState(currentDescription)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await updateMutation.mutateAsync({ communityId: communitySlug, description })
            toast.success('Description updated.')
            onClose()
        } catch {
            toast.error('Failed to update description.')
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">Edit Description</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community about?" rows={4} />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>Cancel</Button>
                        <Button type="submit" className="bg-accent hover:bg-accent-light text-white" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/_public/communities/$communitySlug')({
    component: CommunityDetailPage,
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CommunityDetailPage() {
    const { communitySlug } = Route.useParams()
    const navigate = useNavigate()

    const [isJoining, setIsJoining] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [editPost, setEditPost] = useState<CommunityPost | null>(null)
    const [deletePost, setDeletePost] = useState<CommunityPost | null>(null)

    const { data: me } = useQuery(meQueryOptions)
    const { data: community, isLoading } = useQuery(communityDetailQueryOptions(communitySlug))
    const { data: membersData } = useQuery({
        ...communityMembersQueryOptions(communitySlug, 1, 50),
        enabled: !!me,
    })
    const { matchedUsernames, sendMessageTo } = useMessaging()

    const {
        data: postsData,
        isLoading: postsLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useInfiniteCommunityPosts(community?.is_member ? community.id : '')

    const joinMutation = useJoinCommunityMutation()
    const leaveMutation = useLeaveCommunityMutation()
    const updateMutation = useUpdateCommunityDescriptionMutation()

    const isMember = community?.is_member ?? false
    const isCreator = Boolean(me && community?.created_by_username === me.username)
    const members = membersData?.results ?? []
    const totalMembers = membersData?.count ?? 0
    const posts = postsData?.pages.flatMap((p) => p.results) ?? []
    const totalPosts = postsData?.pages[0]?.count ?? 0

    const handleJoin = async () => {
        setIsJoining(true)
        try {
            await joinMutation.mutateAsync(communitySlug)
            toast.success('Joined community!')
        } catch {
            toast.error('Failed to join community.')
        } finally {
            setIsJoining(false)
        }
    }

    const handleLeave = async () => {
        setIsLeaving(true)
        try {
            await leaveMutation.mutateAsync(communitySlug)
            toast.success('Left community.')
        } catch {
            toast.error('Failed to leave community.')
        } finally {
            setIsLeaving(false)
        }
    }

    if (isLoading) {
        return <div className="page-wrap py-24 text-center text-ink-soft text-lg">Loading community…</div>
    }

    if (!community) {
        return (
            <div className="page-wrap py-24 text-center">
                <p className="text-ink-soft text-lg">Community not found.</p>
                <Link to="/communities" className="text-accent hover:underline text-sm mt-2 block">← Back to Communities</Link>
            </div>
        )
    }

    const colorClass = AVATAR_COLORS[community.name.length % AVATAR_COLORS.length]
    const initials = community.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()

    return (
        <div className="py-4 sm:py-6 rise-in flex flex-col gap-5">

            {/* ── Back link ───────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6">
                <Link to="/communities" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Communities
                </Link>
            </div>

            {/* ── Two-column layout: LEFT = members sidebar, RIGHT = header + feed ── */}
            <div className="flex items-start gap-6 px-4 sm:px-6 w-full">

                {/* ── LEFT: Members sidebar (authenticated users only) ────── */}
                {me && (
                    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-20 self-start">
                        <div className="island-shell rounded-xl flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                                <span className="text-sm font-semibold text-ink">Members</span>
                                <span className="text-xs text-ink-soft">{totalMembers.toLocaleString()}</span>
                            </div>
                            <div className="overflow-y-auto divide-y divide-line">
                                {members.length === 0 ? (
                                    <p className="text-xs text-ink-soft px-4 py-6 text-center">No members yet.</p>
                                ) : (
                                    <>
                                        {members.map((profile) => (
                                            <MemberCard
                                                key={profile.id}
                                                profile={profile}
                                                onViewProfile={(username) => navigate({ to: '/profiles/$username', params: { username } })}
                                                onSendMessage={matchedUsernames.has(profile.username) ? sendMessageTo : undefined}
                                            />
                                        ))}
                                        {totalMembers > 50 && (
                                            <p className="text-xs text-ink-soft px-4 py-3 text-center">
                                                and {(totalMembers - 50).toLocaleString()} more
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </aside>
                )}

                {/* ── RIGHT: Community header + feed ──────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col gap-5">

                    {/* Community header island */}
                    <div className="island-shell rounded-2xl shadow-md flex flex-col">
                        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5">
                            <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 border border-white/50 shadow-sm', colorClass)}>
                                {initials}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                <Display as="h1" className="text-2xl sm:text-3xl text-ink leading-tight">{community.name}</Display>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {community.created_by_username && (
                                        <Muted className="text-sm">
                                            Created by{' '}
                                            <Link to="/profiles/$username" params={{ username: community.created_by_username }} className="text-accent hover:underline">
                                                @{community.created_by_username}
                                            </Link>
                                        </Muted>
                                    )}
                                    <p className="flex items-center gap-1.5 text-ink-soft text-sm">
                                        <Users className="h-3.5 w-3.5" />
                                        {community.member_count.toLocaleString()} member{community.member_count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <p className="text-ink-soft leading-relaxed">
                                    {community.description || <span className="italic">No description yet.</span>}
                                </p>
                            </div>
                        </div>

                        {me && (
                            <>
                                <div className="border-t border-line" />
                                <div className="px-6 sm:px-8 py-3 flex items-center justify-between gap-4">
                                    <div>
                                        {isCreator && (
                                            <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-2 py-1.5 rounded-md">
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit Description
                                            </button>
                                        )}
                                    </div>
                                    {isMember ? (
                                        <button onClick={handleLeave} disabled={isLeaving} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors px-2 py-1.5 rounded-md disabled:opacity-50">
                                            {isLeaving ? 'Leaving…' : 'Leave Community'}
                                        </button>
                                    ) : (
                                        <Button className="bg-accent hover:bg-accent-light text-white shadow-sm" size="sm" disabled={isJoining} onClick={handleJoin}>
                                            {isJoining ? 'Joining…' : 'Join Community'}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Feed */}
                    <div className="flex flex-col gap-4">
                        {!isMember ? (
                            <div className="island-shell rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-sm opacity-60">
                                <Lock className="h-8 w-8 text-ink-soft" />
                                <p className="text-ink font-semibold">Members only</p>
                                <Muted className="text-sm">Join this community to access the feed.</Muted>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-end">
                                    <Button onClick={() => setCreateOpen(true)} className="rounded-full bg-accent hover:bg-accent/90 text-white gap-2" size="sm">
                                        <Plus className="w-4 h-4" />
                                        New Post
                                    </Button>
                                </div>

                                {postsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                                    </div>
                                ) : posts.length === 0 ? (
                                    <div className="island-shell rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-sm">
                                        <p className="text-ink font-semibold">No posts yet.</p>
                                        <Muted className="text-sm max-w-sm">Be the first to share something with this community.</Muted>
                                    </div>
                                ) : (
                                    <div className="island-shell rounded-xl overflow-hidden">
                                        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                                            <span className="text-sm font-semibold text-ink">Posts</span>
                                            <span className="text-xs text-ink-soft">{totalPosts} total</span>
                                        </div>
                                        <div className="flex flex-col gap-3 p-4">
                                            {posts.map((post) => (
                                                <CommunityPostCard
                                                    key={post.id}
                                                    post={post}
                                                    isOwn={me?.username === post.author.username}
                                                    onEdit={setEditPost}
                                                    onDelete={setDeletePost}
                                                />
                                            ))}
                                        </div>
                                        <div className="px-4 pb-4 flex flex-col items-center gap-2">
                                            <Muted className="text-xs">{posts.length} of {totalPosts} posts</Muted>
                                            {hasNextPage && (
                                                <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                                                    {isFetchingNextPage
                                                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Loading…</>
                                                        : 'Load more'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>{/* end RIGHT column */}

            </div>{/* end two-column */}

            {/* ── Modals ──────────────────────────────────────────────────── */}
            <EditDescriptionModal
                open={showEditModal}
                currentDescription={community.description}
                communitySlug={communitySlug}
                onClose={() => setShowEditModal(false)}
                updateMutation={updateMutation}
            />
            {community && (
                <>
                    <CreatePostDialog communityId={community.id} open={createOpen} onOpenChange={setCreateOpen} />
                    {editPost && (
                        <EditPostDialog communityId={community.id} post={editPost} open={!!editPost} onOpenChange={(open) => { if (!open) setEditPost(null) }} />
                    )}
                    {deletePost && (
                        <DeletePostDialog communityId={community.id} post={deletePost} open={!!deletePost} onOpenChange={(open) => { if (!open) setDeletePost(null) }} />
                    )}
                </>
            )}
        </div>
    )
}
