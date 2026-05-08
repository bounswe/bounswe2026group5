import { useUploadPostMedia } from '#/lib/queries/ProfilePostQueries.ts'
import { Button } from '@/components/ui/button'
import { Loader2, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface MediaUploadFieldProps {
    onUrl: (url: string | null) => void
    currentUrl?: string | null
}

export function MediaUploadField({ onUrl, currentUrl }: MediaUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const upload = useUploadPostMedia()
    const [preview, setPreview] = useState<{ name: string; objectUrl?: string } | null>(
        currentUrl ? { name: currentUrl.split('/').pop() ?? 'media' } : null,
    )

    function handleFile(file: File) {
        const isImage = file.type.startsWith('image/')
        const objectUrl = isImage ? URL.createObjectURL(file) : undefined
        setPreview({ name: file.name, objectUrl })
        upload.mutate(file, {
            onSuccess: (data) => {
                onUrl(data.url)
            },
            onError: () => {
                setPreview(null)
                onUrl(null)
            },
        })
    }

    function handleClear() {
        if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl)
        setPreview(null)
        onUrl(null)
        if (inputRef.current) inputRef.current.value = ''
        upload.reset()
    }

    return (
        <div className="flex flex-col gap-1.5">
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                }}
            />
            {preview ? (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm">
                    {preview.objectUrl && (
                        <img src={preview.objectUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    )}
                    <span className="flex-1 truncate text-ink-soft">{preview.name}</span>
                    {upload.isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0 text-accent" />}
                    <button type="button" onClick={handleClear} className="shrink-0 text-ink-soft hover:text-ink">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-1.5"
                    onClick={() => inputRef.current?.click()}
                >
                    <Paperclip className="h-4 w-4" />
                    Attach media
                </Button>
            )}
            {upload.isError && (
                <p className="text-xs text-red-500">Upload failed. Please try again.</p>
            )}
        </div>
    )
}
