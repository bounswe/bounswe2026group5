import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

type NavLinkProps = LinkProps & {
    className?: string
}
// Just a small wrapper for applying consistent styling
// Active props means, when we are on this page.
export function NavLink({ className, ...props }: NavLinkProps) {
    return (
        <Link
            className={cn(
                'text-sm text-ink-soft hover:text-ink transition-colors',
                className
            )}
            activeProps={{
                className: cn(
                    'text-ink font-semibold',
                    className
                )
            }}
            {...props}
        />
    )
}