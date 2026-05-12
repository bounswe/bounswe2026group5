import { createFileRoute, Link } from '@tanstack/react-router'
import { Display, Muted } from '@/components/Typography'
import { Button } from '@/components/ui/button'
import { Users, Star, CalendarDays, MessageSquare, TrendingUp, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/_unauthorized/about')({
    component: About,
})

const FEATURES = [
    {
        icon: Star,
        title: 'Verified Mentors',
        desc: 'Every mentor is rated by their mentees. Find someone trusted by the community, not just an algorithm.',
    },
    {
        icon: CalendarDays,
        title: 'Flexible Scheduling',
        desc: 'Book open slots directly on a mentor\'s calendar. No back-and-forth emails, no friction.',
    },
    {
        icon: Users,
        title: 'Communities',
        desc: 'Join topic-driven communities, share progress, and learn alongside peers on the same journey.',
    },
    {
        icon: MessageSquare,
        title: 'Direct Messaging',
        desc: 'Once connected, message your mentor or mentee any time. Conversations stay in one place.',
    },
    {
        icon: TrendingUp,
        title: 'Track Your Growth',
        desc: 'Post achievements, milestones, and progress updates to your profile timeline.',
    },
    {
        icon: Sparkles,
        title: 'Curated Discovery',
        desc: 'Filter by skill, rating, and availability to find exactly the mentor you need.',
    },
]

const STEPS = [
    {
        number: '01',
        title: 'Create your profile',
        desc: 'Sign up, pick your role, and fill in your skills or the areas you want to grow in.',
    },
    {
        number: '02',
        title: 'Find the right match',
        desc: 'Browse the Discover page, search by skill, and read community reviews before reaching out.',
    },
    {
        number: '03',
        title: 'Start growing together',
        desc: 'Book sessions, join communities, post milestones, and build a lasting professional relationship.',
    },
]

function About() {
    return (
        <main id="main-content" className="rise-in flex flex-col gap-20 py-16 sm:py-24">

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="page-wrap">
                <section className="flex flex-col items-center gap-6 text-center max-w-4xl mx-auto">
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent">About the platform</p>
                    <Display as="h1" className="text-5xl sm:text-6xl md:text-7xl tracking-tight text-ink">
                        Neighborship,{' '}
                        <span className="italic text-accent">Done Right</span>
                    </Display>
                    <p className="text-lg text-ink-soft leading-relaxed max-w-2xl">
                        We built this platform because finding a great mentor should not be hard.
                        No cold emails, no LinkedIn guesswork — just a curated network where knowledge flows freely.
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                        <Link to="/register">
                            <Button className="bg-accent hover:bg-accent-light text-white px-8">
                                Get started free
                            </Button>
                        </Link>
                        <Link to="/discover">
                            <Button variant="ghost" className="text-ink-soft hover:text-ink">
                                Browse mentors →
                            </Button>
                        </Link>
                    </div>
                </section>
            </div>

            {/* ── Mission ───────────────────────────────────────────────── */}
            <div className="page-wrap">
                <div className="island-shell rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row gap-10 items-start">
                    <div className="shrink-0 h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <h2 className="text-2xl font-bold text-ink font-display">Our mission</h2>
                        <p className="text-ink-soft leading-relaxed max-w-3xl">
                            Careers grow fastest when someone further down the road shares what they wish they had known earlier.
                            Our mission is to make that conversation happen at scale — connecting ambitious learners with experienced
                            professionals in a structured, respectful, and productive environment.
                        </p>
                        <p className="text-ink-soft leading-relaxed max-w-3xl">
                            We are built by students and practitioners who experienced both sides of mentorship firsthand.
                            Every feature here was designed to remove friction and make the relationship as valuable as possible.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Features grid ─────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h2 className="text-3xl font-bold text-ink font-display">Everything you need</h2>
                    <Muted className="max-w-xl">From discovery to deep mentorship — all in one place.</Muted>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="island-shell rounded-xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
                            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 text-accent" />
                            </div>
                            <h3 className="font-semibold text-ink">{title}</h3>
                            <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── How it works ──────────────────────────────────────────── */}
            <div className="page-wrap flex flex-col gap-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h2 className="text-3xl font-bold text-ink font-display">How it works</h2>
                    <Muted className="max-w-xl">Three steps from sign-up to your first session.</Muted>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {STEPS.map(({ number, title, desc }) => (
                        <div key={number} className="flex flex-col gap-4">
                            <span className="text-5xl font-bold font-display text-accent/20 leading-none">{number}</span>
                            <h3 className="text-lg font-semibold text-ink">{title}</h3>
                            <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────── */}
            <div className="page-wrap">
                <div className="island-shell rounded-2xl p-10 sm:p-16 flex flex-col items-center gap-6 text-center">
                    <Display as="h2" className="text-4xl sm:text-5xl text-ink">
                        Ready to find your{' '}
                        <span className="italic text-accent">mentor</span>?
                    </Display>
                    <p className="text-ink-soft max-w-xl leading-relaxed">
                        Join the network today. It is free to sign up, free to discover, and the first session is always yours to arrange.
                    </p>
                    <div className="flex items-center gap-3">
                        <Link to="/register">
                            <Button className="bg-accent hover:bg-accent-light text-white px-10 py-5 rounded-full text-sm font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                Create your account
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="ghost" className="text-ink-soft hover:text-ink">
                                Sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

        </main>
    )
}
