// web/src/components/layout/AuthorizedHeader.tsx
import { Link, useRouter, useNavigate, useSearch } from '@tanstack/react-router'
import { setDemoAuthRole } from '@/lib/demoAuth'
import { Button } from '@/components/ui/button'

export function AuthorizedHeader() {
  const router = useRouter()
  const navigate = useNavigate()
  
  // strict: false allows us to read the URL even though the header is outside the specific route
  const search: any = useSearch({ strict: false })
  const isMentorMode = search.mode === 'mentor'
  const currentMode = isMentorMode ? 'mentor' : 'mentee'

  const handleLogout = () => {
    setDemoAuthRole(null)
    router.navigate({ to: '/login' })
  }

  const toggleMode = () => {
    navigate({
      to: '/dashboard',
      search: { mode: isMentorMode ? 'mentee' : 'mentor' }
    })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-header-bg backdrop-blur-md">
      <div className="page-wrap flex h-14 items-center justify-between">
        
        {/* Left Side: Logo and Navigation */}
        <div className="flex items-center gap-8">
          <Link 
            to="/dashboard" 
            search={{ mode: currentMode }}
            className="font-bold font-display tracking-tight text-lg text-ink"
          >
            Mentorship
          </Link>
          
          <nav className="hidden sm:flex items-center gap-6">
            <Link 
              to="/dashboard" 
              search={{ mode: currentMode }}
              activeProps={{ className: "text-ink font-semibold" }} 
              className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Dashboard
            </Link>

            <div className="flex items-center gap-1 opacity-60 cursor-not-allowed">
              <span className="text-sm font-medium text-ink-soft">Discover</span>
              <span className="text-[10px] uppercase tracking-wider bg-accent-muted text-ink px-1.5 py-0.5 rounded-sm">Soon</span>
            </div>
            <div className="flex items-center gap-1 opacity-60 cursor-not-allowed">
              <span className="text-sm font-medium text-ink-soft">Requests</span>
              <span className="text-[10px] uppercase tracking-wider bg-accent-muted text-ink px-1.5 py-0.5 rounded-sm">Soon</span>
            </div>
          </nav>
        </div>

        {/* Right Side: Upgraded Profile & Actions */}
        <div className="flex items-center gap-5">
          
          {/* UPGRADE: Custom Role Toggle Pill */}
          <div className="hidden sm:flex items-center bg-accent-muted rounded-full p-0.5 border border-line">
            <button
              onClick={toggleMode}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                !isMentorMode ? 'bg-background text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Mentee
            </button>
            <button
              onClick={toggleMode}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                isMentorMode ? 'bg-background text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Mentor
            </button>
          </div>

          <div className="w-px h-6 bg-line hidden sm:block"></div>

          {/* Fake User Avatar & Logout */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent text-background flex items-center justify-center text-sm font-bold shadow-sm">
              AS
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-sm text-ink-soft hover:text-ink px-2 inline-flex"
            >
              Sign out
            </Button>
          </div>

        </div>
        
      </div>
    </header>
  )
}