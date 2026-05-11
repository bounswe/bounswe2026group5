import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getInitials(fullName: string): string {
  if (!fullName) return '?'
  return fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
}

const API_SERVER = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/**
 * Convert a Django-relative media path (e.g. `/media/...`) to an absolute URL
 * using VITE_API_URL. Absolute URLs and empty strings are returned unchanged.
 */
export function getAbsoluteMediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  return `${API_SERVER}${path.startsWith('/') ? '' : '/'}${path}`
}