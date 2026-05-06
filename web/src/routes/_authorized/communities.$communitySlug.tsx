import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
    Users, ChevronLeft, ChevronRight, Lock, Pencil,
    Plus, Trophy, TrendingUp, Trash2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Display, Muted } from '@/components/Typography'
import { ProfileCard } from '@/components/features/discover/ProfileCard'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    communityDetailQueryOptions,
    communityMembersQueryOptions,
    useJoinCommunityMutation,
    useLeaveCommunityMutation,
    useUpdateCommunityDescriptionMutation,
    useCommunityPosts,
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

// ---------------------------------------------------------------------------
// Shared metadata
// ---------------------------------------------------------------------------

const EVENT_TYPE_META = {
    achievement: { label: 'Achievement', Icon: Trophy, className: 'bg-amber-100 text-amber-700 border-amber-200' },
    social: { label: 'Social', Icon: Users, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    progress: { label: 'Progress', Icon: TrendingUp, className: 'bg-green-100 text-green-700 border-green-200' },
} as const

function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Edit Description Modal
// ---------------------------------------------------------------------------

interface EditDescriptionModalProps {
    open: boolean
    currentDescription: string
    communitySlug: string
    onClose: () => void
    updateMutation: ReturnType<typeof useUpdateCommunityDescriptionMutation>
}

function EditDescriptionModal({
    open,
    currentDescription,
    communitySlug,
    onClose,
    updateMutation,
}: EditDescriptionModalProps) {
    const [description, setDescription] = useState(currentDescription)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await updateMutation.mutateAsync({ communitySlug, description })
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
                        <Textarea
                            id="edit-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this community about?"
                            rows={4}
                        />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
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
// Community Post Card
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
    const meta = EVENT_TYPE_META[post.event_type]
    const { Icon, label, className } = meta

    return (
        <Card className="border-line shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
                            <Icon className="w-3 h-3" />
                            {label}
                        </span>
                    </div>
                    {isOwn && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-ink-soft hover:text-ink"
                                onClick={() => onEdit(post)}
                                aria-label="Edit post"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-ink-soft hover:text-red-500"
                                onClick={() => onDelete(post)}
                                aria-label="Delete post"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                <Muted className="text-xs font-medium">
                    <Link
                        to="/profiles/$username"
                        params={{ username: post.author.username }}
                        className="text-accent hover:underline"
                    >
                        {post.author.display_name}
                    </Link>
                </Muted>

                {post.content && (
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}

                {post.media_url && (
                    <a
                        href={post.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent underline truncate"
                    >
                        {post.media_url}
                    </a>
                )}

                {post.tagged_users.length > 0 && (
                    <Muted className="text-xs">
                        with{' '}
                        {post.tagged_users.map((u, i) => (
                            <span key={u.user_id}>
                                <Link
                                    to="/profiles/$username"
                                    params={{ username: u.username }}
                                    className="text-accent hover:underline"
                                >
                                    @{u.username}
                                </Link>
                                {i < post.tagged_users.length - 1 && ', '}
                            </span>
                        ))}
                    </Muted>
                )}

                <Muted className="text-xs">{formatTimestamp(post.timestamp)}</Muted>
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Tagged users checklist (shared between create and edit dialogs)
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
                <DialogHeader>
                    <DialogTitle>New Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_create_type">Type</Label>
                        <Select
                            value={form.event_type}
                            onValueChange={(v) => setForm((f) => ({ ...f, event_type: v as CommunityPostCreatePayload['event_type'] }))}
                        >
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
                        <Textarea
                            id="cop_create_content"
                            value={form.content}
                            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                            placeholder="Share something with this community…"
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{form.content.length}/2000</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Tag people <span className="text-ink-soft text-xs">(max 5)</span></Label>
                        <TaggableUsersList
                            communityId={communityId}
                            selected={form.tagged_users ?? []}
                            onChange={(usernames) => setForm((f) => ({ ...f, tagged_users: usernames }))}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_create_media">Media URL (optional)</Label>
                        <Input
                            id="cop_create_media"
                            value={(form.media_url as string) ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://…"
                            type="url"
                        />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox
                            checked={form.show_on_profile}
                            onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_profile: Boolean(v) }))}
                        />
                        Share to my profile
                    </label>

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={!form.content.trim() || createMutation.isPending}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
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
        editMutation.mutate(
            { postId: post.id, payload },
            {
                onSuccess: () => { toast.success('Post updated'); onOpenChange(false) },
                onError: () => toast.error('Failed to update post. Please try again.'),
            },
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_edit_type">Type</Label>
                        <Select
                            value={form.event_type}
                            onValueChange={(v) => setForm((f) => ({ ...f, event_type: v as CommunityPostUpdatePayload['event_type'] }))}
                        >
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
                        <Textarea
                            id="cop_edit_content"
                            value={form.content ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                            placeholder="Share something with this community…"
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{(form.content ?? '').length}/2000</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Tag people <span className="text-ink-soft text-xs">(max 5)</span></Label>
                        <TaggableUsersList
                            communityId={communityId}
                            selected={form.tagged_users ?? []}
                            onChange={(usernames) => setForm((f) => ({ ...f, tagged_users: usernames }))}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cop_edit_media">Media URL (optional)</Label>
                        <Input
                            id="cop_edit_media"
                            value={(form.media_url as string) ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://…"
                            type="url"
                        />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox
                            checked={form.show_on_profile}
                            onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_profile: Boolean(v) }))}
                        />
                        Share to my profile
                    </label>

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={!form.content?.trim() || editMutation.isPending}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
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
                <DialogHeader>
                    <DialogTitle>Delete Post</DialogTitle>
                </DialogHeader>
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
// Constants
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
]

const MEMBERS_PAGE_SIZE = 9

export const Route = createFileRoute('/_authorized/communities/$communitySlug')({
    component: CommunityDetailPage,
})

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CommunityDetailPage() {
    const { communitySlug } = Route.useParams()
    const navigate = useNavigate()
    const [membersPage, setMembersPage] = useState(1)
    const [isJoining, setIsJoining] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [editPost, setEditPost] = useState<CommunityPost | null>(null)
    const [deletePost, setDeletePost] = useState<CommunityPost | null>(null)

    const { data: me } = useQuery(meQueryOptions)
    const { data: community, isLoading } = useQuery(communityDetailQueryOptions(communitySlug))
    const { data: membersData } = useQuery(
        communityMembersQueryOptions(communitySlug, membersPage, MEMBERS_PAGE_SIZE),
    )
    const { data: postsData, isLoading: postsLoading } = useCommunityPosts(
        community?.is_member ? community.id : '',
    )

    const joinMutation = useJoinCommunityMutation()
    const leaveMutation = useLeaveCommunityMutation()
    const updateMutation = useUpdateCommunityDescriptionMutation()
    const { matchedUsernames, sendMessageTo } = useMessaging()

    const isMember = community?.is_member ?? false
    const isCreator = Boolean(me && community?.created_by_username === me.username)
    const members = membersData?.results ?? []
    const totalMembers = membersData?.count ?? 0
    const totalPages = Math.ceil(totalMembers / MEMBERS_PAGE_SIZE)
    const posts = postsData?.results ?? []

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
        return (
            <div className="page-wrap py-24 text-center text-ink-soft text-lg">
                Loading community…
            </div>
        )
    }

    if (!community) {
        return (
            <div className="page-wrap py-24 text-center">
                <p className="text-ink-soft text-lg">Community not found.</p>
                <Link to="/communities" className="text-accent hover:underline text-sm mt-2 block">
                    ← Back to Communities
                </Link>
            </div>
        )
    }

    const colorClass = AVATAR_COLORS[community.name.length % AVATAR_COLORS.length]
    const initials = community.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()

    return (
        <div className="py-10 sm:py-16 rise-in flex flex-col gap-12">

            {/* ── Back link ───────────────────────────────────────────────── */}
            <div className="page-wrap">
                <Link
                    to="/communities"
                    className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Communities
                </Link>
            </div>

            {/* ── Community Header ────────────────────────────────────────── */}
            <div className="page-wrap">
                <div className="island-shell rounded-2xl shadow-md flex flex-col">

                    {/* Top: avatar + meta */}
                    <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-start gap-7">
                        <div
                            className={cn(
                                'h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 border border-white/50 shadow-sm',
                                colorClass,
                            )}
                        >
                            {initials}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                            <Display as="h1" className="text-3xl sm:text-4xl text-ink leading-tight">
                                {community.name}
                            </Display>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                {community.created_by_username && (
                                    <Muted className="text-sm">
                                        Created by{' '}
                                        <Link
                                            to="/profiles/$username"
                                            params={{ username: community.created_by_username }}
                                            className="text-accent hover:underline"
                                        >
                                            @{community.created_by_username}
                                        </Link>
                                    </Muted>
                                )}
                                <p className="flex items-center gap-1.5 text-ink-soft text-sm">
                                    <Users className="h-3.5 w-3.5" />
                                    {community.member_count.toLocaleString()} member{community.member_count !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <p className="text-ink-soft leading-relaxed max-w-2xl mt-1">
                                {community.description || <span className="italic">No description yet.</span>}
                            </p>
                        </div>
                    </div>

                    {/* Footer: actions row */}
                    {me && (
                        <>
                            <div className="border-t border-line" />
                            <div className="px-8 sm:px-10 py-4 flex items-center justify-between gap-4">
                                <div>
                                    {isCreator && (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-2 py-1.5 rounded-md"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit Description
                                        </button>
                                    )}
                                </div>

                                {isMember ? (
                                    <button
                                        onClick={handleLeave}
                                        disabled={isLeaving}
                                        className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors px-2 py-1.5 rounded-md disabled:opacity-50"
                                    >
                                        {isLeaving ? 'Leaving…' : 'Leave Community'}
                                    </button>
                                ) : (
                                    <Button
                                        className="bg-accent hover:bg-accent-light text-white shadow-sm"
                                        size="sm"
                                        disabled={isJoining}
                                        onClick={handleJoin}
                                    >
                                        {isJoining ? 'Joining…' : 'Join Community'}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Members ─────────────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-line" />
                    <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Members
                    </span>
                    <div className="flex-1 border-t border-line" />
                </div>

                {members.length === 0 ? (
                    <p className="text-ink-soft text-center py-12">No members yet. Be the first to join!</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {members.map((profile) => (
                                <ProfileCard
                                    key={profile.id}
                                    profile={profile}
                                    onViewProfile={(username) =>
                                        navigate({ to: '/profiles/$username', params: { username } })
                                    }
                                    onSendMessage={matchedUsernames.has(profile.username) ? sendMessageTo : undefined}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <Button
                                    variant="outline" size="icon"
                                    disabled={membersPage === 1}
                                    onClick={() => setMembersPage((p) => p - 1)}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-ink-soft">
                                    Page {membersPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline" size="icon"
                                    disabled={membersPage >= totalPages}
                                    onClick={() => setMembersPage((p) => p + 1)}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Community Feed ──────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-line" />
                    <span className="text-xs text-ink-soft uppercase tracking-widest font-semibold">
                        Community Feed
                    </span>
                    <div className="flex-1 border-t border-line" />
                </div>

                {isMember ? (
                    <>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setCreateOpen(true)}
                                className="rounded-full bg-accent hover:bg-accent/90 text-white gap-2"
                                size="sm"
                            >
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
                                <Muted className="text-sm max-w-sm">
                                    Be the first to share something with this community.
                                </Muted>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        )}
                    </>
                ) : (
                    <div className="island-shell rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-sm opacity-60">
                        <Lock className="h-8 w-8 text-ink-soft" />
                        <p className="text-ink font-semibold">Members only</p>
                        <Muted className="text-sm">Join this community to access the feed.</Muted>
                    </div>
                )}
            </div>

            {/* ── Dialogs ─────────────────────────────────────────────────── */}
            <EditDescriptionModal
                open={showEditModal}
                currentDescription={community.description}
                communitySlug={communitySlug}
                onClose={() => setShowEditModal(false)}
                updateMutation={updateMutation}
            />
            <CreatePostDialog
                communityId={community.id}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            {editPost && (
                <EditPostDialog
                    communityId={community.id}
                    post={editPost}
                    open={!!editPost}
                    onOpenChange={(open) => { if (!open) setEditPost(null) }}
                />
            )}
            {deletePost && (
                <DeletePostDialog
                    communityId={community.id}
                    post={deletePost}
                    open={!!deletePost}
                    onOpenChange={(open) => { if (!open) setDeletePost(null) }}
                />
            )}
        </div>
    )
}
