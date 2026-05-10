import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
    { to: '/discover',    label: 'Discover'    },
    { to: '/communities', label: 'Communities' },
    { to: '/about',       label: 'About'       },
] as const

export function UnauthorizedHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-line bg-header-bg backdrop-blur-md">
            <div className="page-wrap flex h-14 items-center justify-between">

                {/* Left: Logo and Navigation */}
                <div className="flex items-center gap-8">
                    <Link to="/discover" className="flex items-center gap-2 font-bold font-display tracking-tight text-lg text-ink">
                        <img src="/icon.png" alt="" aria-hidden="true" className="h-7 w-7 rounded-lg" />
                        Neighborship
                    </Link>

                    <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
                        {NAV_LINKS.map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                activeProps={{ className: 'bg-accent-muted text-ink font-semibold' }}
                                className="text-sm font-medium text-ink-soft hover:text-ink hover:bg-accent-muted/60 transition-colors px-3 py-1.5 rounded-lg"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link to="/login">
                        <Button variant="ghost" size="sm" className="text-sm text-ink-soft hover:text-ink">
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