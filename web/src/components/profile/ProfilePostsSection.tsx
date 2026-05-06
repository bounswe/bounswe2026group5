import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, Trophy, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Muted } from '@/components/Typography'
import {
    useProfilePosts,
    useCreateProfilePost,
    useEditProfilePost,
    useDeleteProfilePost,
    type ProfilePost,
    type ProfilePostCreatePayload,
    type ProfilePostUpdatePayload,
} from '#/lib/queries/ProfilePostQueries.ts'

// ---- Types ----

interface ProfilePostsSectionProps {
    username: string
    isOwner: boolean
}

// ---- Metadata ----

const EVENT_TYPE_META = {
    achievement: { label: 'Achievement', Icon: Trophy, className: 'bg-amber-100 text-amber-700 border-amber-200' },
    social: { label: 'Social', Icon: Users, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    progress: { label: 'Progress', Icon: TrendingUp, className: 'bg-green-100 text-green-700 border-green-200' },
} as const

function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

// ---- Section ----

export function ProfilePostsSection({ username, isOwner }: ProfilePostsSectionProps) {
    const { data: feed, isLoading } = useProfilePosts(username)
    const [createOpen, setCreateOpen] = useState(false)
    const [editPost, setEditPost] = useState<ProfilePost | null>(null)
    const [deletePost, setDeletePost] = useState<ProfilePost | null>(null)

    return (
        <section className="w-full mt-10 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">Posts</h2>
                {isOwner && (
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="rounded-full bg-accent hover:bg-accent/90 text-white gap-2"
                        size="sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Post
                    </Button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                </div>
            ) : !feed || feed.results.length === 0 ? (
                <EmptyState isOwner={isOwner} onAdd={() => setCreateOpen(true)} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feed.results.map(post => (
                        <ProfilePostCard
                            key={post.id}
                            post={post}
                            isOwner={isOwner}
                            onEdit={setEditPost}
                            onDelete={setDeletePost}
                        />
                    ))}
                </div>
            )}

            {/* Dialogs */}
            <CreatePostDialog
                username={username}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            {editPost && (
                <EditPostDialog
                    username={username}
                    post={editPost}
                    open={!!editPost}
                    onOpenChange={open => { if (!open) setEditPost(null) }}
                />
            )}
            {deletePost && (
                <DeleteConfirmDialog
                    username={username}
                    post={deletePost}
                    open={!!deletePost}
                    onOpenChange={open => { if (!open) setDeletePost(null) }}
                />
            )}
        </section>
    )
}

// ---- Post Card ----

function ProfilePostCard({
    post,
    isOwner,
    onEdit,
    onDelete,
}: {
    post: ProfilePost
    isOwner: boolean
    onEdit: (p: ProfilePost) => void
    onDelete: (p: ProfilePost) => void
}) {
    const meta = EVENT_TYPE_META[post.event_type]
    const { Icon, label, className } = meta
    const canEdit = isOwner && post.category === 'PrP'

    return (
        <Card className="border-line shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
                            <Icon className="w-3 h-3" />
                            {label}
                        </span>
                        {post.category === 'MCTE' && (
                            <Badge variant="secondary" className="text-xs">Milestone</Badge>
                        )}
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-ink-soft hover:text-ink"
                                onClick={() => onEdit(post)}
                                aria-label="Edit post"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-ink-soft hover:text-red-500"
                                onClick={() => onDelete(post)}
                                aria-label="Delete post"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
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
                <Muted className="text-xs">{formatTimestamp(post.timestamp)}</Muted>
            </CardContent>
        </Card>
    )
}

// ---- Create Dialog ----

function CreatePostDialog({
    username,
    open,
    onOpenChange,
}: {
    username: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const createMutation = useCreateProfilePost(username)
    const [form, setForm] = useState<ProfilePostCreatePayload>({
        event_type: 'achievement',
        content: '',
        media_url: '',
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.content.trim()) return
        const payload: ProfilePostCreatePayload = {
            event_type: form.event_type,
            content: form.content.trim(),
            ...(form.media_url?.trim() ? { media_url: form.media_url.trim() } : {}),
        }
        createMutation.mutate(payload, {
            onSuccess: () => {
                toast.success('Post published')
                setForm({ event_type: 'achievement', content: '', media_url: '' })
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
                        <Label htmlFor="create_event_type">Type</Label>
                        <Select
                            value={form.event_type}
                            onValueChange={v => setForm(f => ({ ...f, event_type: v as ProfilePostCreatePayload['event_type'] }))}
                        >
                            <SelectTrigger id="create_event_type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="achievement">Achievement</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="progress">Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create_content">Content <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="create_content"
                            value={form.content}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            placeholder="Share an achievement, update, or moment..."
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{form.content.length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create_media_url">Media URL (optional)</Label>
                        <Input
                            id="create_media_url"
                            value={form.media_url ?? ''}
                            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
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

// ---- Edit Dialog ----

function EditPostDialog({
    username,
    post,
    open,
    onOpenChange,
}: {
    username: string
    post: ProfilePost
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const editMutation = useEditProfilePost(username)
    const [form, setForm] = useState<ProfilePostUpdatePayload>({
        event_type: post.event_type,
        content: post.content,
        media_url: post.media_url ?? '',
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const payload: ProfilePostUpdatePayload = {
            event_type: form.event_type,
            content: form.content?.trim(),
            media_url: (form.media_url as string)?.trim() || null,
        }
        editMutation.mutate(
            { postId: post.id, payload },
            {
                onSuccess: () => {
                    toast.success('Post updated')
                    onOpenChange(false)
                },
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
                        <Label htmlFor="edit_event_type">Type</Label>
                        <Select
                            value={form.event_type}
                            onValueChange={v => setForm(f => ({ ...f, event_type: v as ProfilePostUpdatePayload['event_type'] }))}
                        >
                            <SelectTrigger id="edit_event_type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="achievement">Achievement</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="progress">Progress</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit_content">Content <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="edit_content"
                            value={form.content ?? ''}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            placeholder="Share an achievement, update, or moment..."
                            maxLength={2000}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-ink-soft text-right">{(form.content ?? '').length}/2000</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit_media_url">Media URL (optional)</Label>
                        <Input
                            id="edit_media_url"
                            value={(form.media_url as string) ?? ''}
                            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
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

// ---- Delete Confirm Dialog ----

function DeleteConfirmDialog({
    username,
    post,
    open,
    onOpenChange,
}: {
    username: string
    post: ProfilePost
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const deleteMutation = useDeleteProfilePost(username)

    function handleConfirm() {
        deleteMutation.mutate(post.id, {
            onSuccess: () => {
                toast.success('Post deleted')
                onOpenChange(false)
            },
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
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={handleConfirm}
                    >
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---- Empty State ----

function EmptyState({ isOwner, onAdd }: { isOwner: boolean; onAdd: () => void }) {
    return (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-ink text-base font-semibold">No posts yet</p>
            {isOwner ? (
                <>
                    <p className="text-ink-soft text-sm max-w-sm">
                        Share achievements, progress updates, or social moments with your profile visitors.
                    </p>
                    <Button
                        onClick={onAdd}
                        size="sm"
                        className="mt-1 rounded-full bg-accent hover:bg-accent/90 text-white gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create your first post
                    </Button>
                </>
            ) : (
                <p className="text-ink-soft text-sm max-w-sm">
                    This user hasn't shared any posts yet.
                </p>
            )}
        </div>
    )
}
