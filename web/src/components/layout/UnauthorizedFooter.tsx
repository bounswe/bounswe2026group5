import { useLocation } from '@tanstack/react-router'
import { Muted } from '@/components/Typography'
import {NavLink} from '@/components/NavLink'

const FOOTER_LINKS = [
    { to: '/discover', label: 'Discover' },
    { to: '/about',    label: 'About'    },
    { to: '/login',    label: 'Sign in'  },
    { to: '/register', label: 'Register' },
] as const

export function UnauthorizedFooter() {
    return (
        <footer className="site-footer  mt-auto">
            <div className="page-wrap flex flex-col sm:flex-row items-center justify-between gap-4 py-6">


                {/* Links */}
                <nav className="flex items-center gap-5">
                    {FOOTER_LINKS.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Copyright */}
                <Muted as="span" className="text-xs">
                    © {new Date().getFullYear()} Campus Tutor
                </Muted>

            </div>
        </footer>
    )
}