// web/src/routes/_authorized/admin.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Heading, Body, Muted } from '@/components/Typography'
import { Ban, UserCheck, ShieldAlert, Users, GraduationCap, BookOpen, CalendarCheck, Flag } from 'lucide-react'
import {
  ADMIN_STATS,
  ADMIN_USERS,
  ADMIN_REPORTS,
  type MockAdminUser,
  type MockAdminReport,
  type AdminUserStatus,
  type AdminReportStatus,
} from '@/lib/mocks/adminDashboard'
import { getDemoAuthRole } from '@/lib/demoAuth'

export const Route = createFileRoute('/_authorized/admin')({
  beforeLoad: () => {
    if (getDemoAuthRole() !== 'admin') {
      throw redirect({ to: '/dashboard', search: { mode: 'mentee' } })
    }
  },
  component: AdminDashboard,
})

// ---------------------------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  accent?: 'default' | 'green' | 'amber' | 'red'
}) {
  const iconColors = {
    default: 'text-accent bg-accent-muted',
    green: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-500 bg-red-50',
  }
  const color = iconColors[accent ?? 'default']

  return (
    <Card className="island-shell border-line bg-white shadow-sm">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <Muted className="text-xs uppercase tracking-wider font-semibold mb-1">{label}</Muted>
            <p className="text-3xl font-bold text-ink">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: AdminUserStatus }) {
  if (status === 'ACTIVE')
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
        Active
      </Badge>
    )
  if (status === 'BANNED')
    return (
      <Badge className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-50">
        Banned
      </Badge>
    )
  return (
    <Badge className="bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-50">
      Inactive
    </Badge>
  )
}

function RoleBadge({ mode }: { mode: MockAdminUser['mentorshipMode'] }) {
  const labels: Record<MockAdminUser['mentorshipMode'], string> = {
    MENTOR: 'Mentor',
    MENTEE: 'Mentee',
    BOTH: 'Both',
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-accent-muted text-ink border border-line">
      {labels[mode]}
    </span>
  )
}

function ReportStatusBadge({ status }: { status: AdminReportStatus }) {
  if (status === 'PENDING')
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50">
        Pending
      </Badge>
    )
  if (status === 'RESOLVED')
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
        Resolved
      </Badge>
    )
  return (
    <Badge className="bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-50">
      Dismissed
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// REPORTS TABLE
// ---------------------------------------------------------------------------

function ReportsTable() {
  const [reports, setReports] = useState(ADMIN_REPORTS)

  const resolve = (id: string) =>
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'RESOLVED' as AdminReportStatus } : r))

  const dismiss = (id: string) =>
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'DISMISSED' as AdminReportStatus } : r))

  return (
    <div className="rounded-xl border border-line overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-black/[0.02] border-b border-line">
            <TableHead className="font-semibold text-ink text-sm">Reporter</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Reported User</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Description</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Date</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Status</TableHead>
            <TableHead className="font-semibold text-ink text-sm text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <Muted className="text-sm">No reports yet.</Muted>
              </TableCell>
            </TableRow>
          ) : (
            reports.map(report => (
              <TableRow key={report.id} className="border-b border-line/50 hover:bg-black/[0.015] transition-colors">
                <TableCell className="font-medium text-ink">{report.reporterName}</TableCell>
                <TableCell className="font-medium text-ink">{report.reportedName}</TableCell>
                <TableCell className="max-w-xs">
                  <Muted className="text-sm line-clamp-2">{report.description}</Muted>
                </TableCell>
                <TableCell>
                  <Muted className="text-sm">
                    {new Date(report.reportedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Muted>
                </TableCell>
                <TableCell>
                  <ReportStatusBadge status={report.status} />
                </TableCell>
                <TableCell className="text-right">
                  {report.status === 'PENDING' && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 gap-1.5"
                        onClick={() => resolve(report.id)}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200 text-gray-500 hover:bg-gray-50 gap-1.5"
                        onClick={() => dismiss(report.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT TABLE
// ---------------------------------------------------------------------------

function UserManagementTable() {
  const [users, setUsers] = useState(ADMIN_USERS)

  const toggleBan = (id: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== id) return u
        const next: AdminUserStatus = u.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
        return { ...u, status: next }
        // FUTURE: Call PATCH /api/v1/admin/users/{id}/ban/ endpoint
      })
    )
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-black/[0.02] border-b border-line">
            <TableHead className="font-semibold text-ink text-sm">User</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Email</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Mode</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Status</TableHead>
            <TableHead className="font-semibold text-ink text-sm">Joined</TableHead>
            <TableHead className="font-semibold text-ink text-sm text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <Muted className="text-sm">No users yet. Data will appear here once the backend is connected.</Muted>
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => (
              <TableRow key={user.id} className="border-b border-line/50 hover:bg-black/[0.015] transition-colors">
                <TableCell className="font-medium text-ink">{user.displayName}</TableCell>
                <TableCell>
                  <Muted className="text-sm">{user.email}</Muted>
                </TableCell>
                <TableCell>
                  <RoleBadge mode={user.mentorshipMode} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  <Muted className="text-sm">
                    {new Date(user.joinedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Muted>
                </TableCell>
                <TableCell className="text-right">
                  {user.status === 'BANNED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 gap-1.5"
                      onClick={() => toggleBan(user.id)}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Unban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5"
                      onClick={() => toggleBan(user.id)}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Ban
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  return (
    <div className="page-wrap py-10 rise-in flex flex-col gap-10">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-accent" />
          <Heading as="h2">Admin Dashboard</Heading>
        </div>
        <Body className="text-ink-soft max-w-2xl">
          Monitor platform activity, manage users, and review system health.
        </Body>
      </div>

      {/* Stats Grid */}
      <section className="space-y-4">
        <Heading as="h3" className="text-lg">Overview</Heading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Users" value={ADMIN_STATS.totalUsers} icon={Users} />
          <StatCard label="Active Mentors" value={ADMIN_STATS.activeMentors} icon={GraduationCap} accent="green" />
          <StatCard label="Active Mentees" value={ADMIN_STATS.activeMentees} icon={BookOpen} accent="green" />
          <StatCard label="Pending Requests" value={ADMIN_STATS.pendingRequests} icon={CalendarCheck} accent="amber" />
          <StatCard label="Active Sessions" value={ADMIN_STATS.activeSessions} icon={CalendarCheck} accent="default" />
          <StatCard label="Banned Users" value={ADMIN_STATS.bannedUsers} icon={Ban} accent="red" />
        </div>
      </section>

      {/* User Management */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading as="h3" className="text-lg">User Management</Heading>
          <Muted className="text-sm">{ADMIN_USERS.length} users total</Muted>
        </div>
        <UserManagementTable />
      </section>

      {/* Reports */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-500" />
            <Heading as="h3" className="text-lg">Reports</Heading>
          </div>
          <Muted className="text-sm">{ADMIN_REPORTS.length} reports total</Muted>
        </div>
        <ReportsTable />
      </section>

    </div>
  )
}
