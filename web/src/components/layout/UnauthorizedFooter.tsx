import { useState } from 'react'
import { NavLink } from '@/components/NavLink'
import { Muted } from '@/components/Typography'
import { LegalModal } from '@/components/common/LegalModal'

const FOOTER_LINKS = [
    { to: '/discover', label: 'Discover' },
    { to: '/about',    label: 'About'    },
    { to: '/login',    label: 'Sign in'  },
    { to: '/register', label: 'Register' },
] as const

export function UnauthorizedFooter() {
    const [legalType, setLegalType] = useState<'tos' | 'privacy' | null>(null)

    return (
        <footer className="site-footer  mt-auto">
            <div className="page-wrap flex flex-col sm:flex-row items-center justify-between gap-4 py-6">


                {/* Links */}
                <nav aria-label="Footer navigation" className="flex items-center gap-5">
                    {FOOTER_LINKS.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                        >
                            {label}
                        </NavLink>
                    ))}
                    <button 
                        onClick={() => setLegalType('tos')}
                        className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
                    >
                        Terms
                    </button>
                    <button 
                        onClick={() => setLegalType('privacy')}
                        className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
                    >
                        Privacy
                    </button>
                </nav>

                {/* Copyright */}
                <Muted as="span" className="text-xs">
                    © {new Date().getFullYear()} Neighborship
                </Muted>

            </div>

            <LegalModal 
                type={legalType} 
                isOpen={legalType !== null} 
                onClose={() => setLegalType(null)} 
            />
        </footer>
    )
}