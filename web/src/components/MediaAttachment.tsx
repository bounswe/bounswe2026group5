import { useState } from 'react'
import { cn, getAbsoluteMediaUrl } from '@/lib/utils'

export function mediaFileName(url: string): string {
    const raw = url.split('/').pop()?.split('?')[0] ?? 'media'
    return /^[a-f0-9]{32}_/.test(raw) ? raw.slice(33) : raw
}

function isPdfUrl(url: string): boolean {
    return url.split('?')[0].toLowerCase().endsWith('.pdf')
}

interface MediaAttachmentProps {
    url: string
    imgClassName?: string
    linkClassName?: string
    onLoad?: () => void
}

export function MediaAttachment({ url, imgClassName, linkClassName, onLoad }: MediaAttachmentProps) {
    const absUrl = getAbsoluteMediaUrl(url)
    const [imgFailed, setImgFailed] = useState(isPdfUrl(absUrl))

    if (!imgFailed) {
        return (
            <a href={absUrl} target="_blank" rel="noopener noreferrer" className="block max-w-full overflow-hidden">
                <img
                    src={absUrl}
                    alt={mediaFileName(url)}
                    className={cn('max-h-60 rounded-lg border border-line object-contain', imgClassName)}
                    onError={() => setImgFailed(true)}
                    onLoad={onLoad}
                />
            </a>
        )
    }

    return (
        <a
            href={absUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('text-xs text-accent-aa underline truncate block', linkClassName)}
        >
            {mediaFileName(url)}
        </a>
    )
}
