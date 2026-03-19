// web/src/components/layout/AuthorizedHeader.tsx
import { Link, useRouter } from '@tanstack/react-router'
import { setDemoAuthRole } from '@/lib/demoAuth'
import { Button } from '@/components/ui/button'

export function AuthorizedHeader() {
  const router = useRouter()

  const handleLogout = () => {
    // FUTURE: This will make an API call to Django to invalidate the real session/token.
    setDemoAuthRole(null)
    router.navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-header-bg backdrop-blur-md">
        <div className="page-wrap flex h-14 items-center justify-between">
        
        {/* Left Side: Logo and Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="font-bold font-display tracking-tight text-lg text-ink">
            Mentorship
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link 
              to="/dashboard" 
              activeProps={{ className: "text-ink font-semibold" }} 
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Dashboard
            </Link>

            {/* FUTURE: Replace these with real NavLinks once routes are made */}
            <span className="text-sm font-medium text-ink-soft cursor-not-allowed opacity-50" title="Coming soon">
              Discover
            </span>
            <span className="text-sm font-medium text-ink-soft cursor-not-allowed opacity-50" title="Coming soon">
              Requests
            </span>
            <span className="text-sm font-medium text-ink-soft cursor-not-allowed opacity-50" title="Coming soon">
              Sessions
            </span>
          </nav>
        </div>

        {/* Right Side: User Actions */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleLogout} className="border-line text-sm text-ink-soft hover:text-ink">
            Demo Logout
          </Button>
        </div>
        
      </div>
    </header>
  )
}