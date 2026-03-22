import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {NavLink} from "#/components/NavLink.tsx";

const NAV_LINKS = [
    { to: '/discover', label: 'Discover' },
    { to: '/about',    label: 'About'    },
] as const

export function UnauthorizedHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-line bg-header-bg backdrop-blur-md">
            <div className="page-wrap flex h-14 items-center justify-between">


                {/* Nav */}
                <nav className="hidden sm:flex items-center gap-6">
                    {NAV_LINKS.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link to="/login">
                        <Button variant="ghost" size="sm" className="text-sm text-(--color-brand-ink-soft) hover:text-(--color-brand-ink)">
                            Sign in
                        </Button>
                    </Link>
                    <Link to="/register">
                        <Button size="sm" className="text-sm">
                            Get started
                        </Button>
                    </Link>
                </div>

            </div>
        </header>
    )
}