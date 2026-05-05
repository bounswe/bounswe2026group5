// web/src/routes/_authorized/admin-moderation.tsx
import {
  adminReportsQueryOptions,
  adminUsersQueryOptions,
  useResolveReport,
  useToggleBan,
  type AdminUser,
  type Report,
} from "#/lib/queries/AdminQueries.ts"
import { meQueryOptions } from "#/lib/queries/AuthQueries.ts"
import { Body, Display, Muted } from '@/components/Typography'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute('/_authorized/admin-moderation')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (!me || me.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminModerationPage,
})

// ---------------------------------------------------------------------------
// STATUS HELPERS
// ---------------------------------------------------------------------------

function ReportStatusBadge({ status }: Readonly<{ status: string }>) {
  switch (status) {
    case 'OPEN':
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
          <Clock className="w-3 h-3 mr-1" />
          Open
        </Badge>
      )
    case 'IN_REVIEW':
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
          <Eye className="w-3 h-3 mr-1" />
          In Review
        </Badge>
      )
    case 'RESOLVED':
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      )
    case 'DISMISSED':
      return (
        <Badge variant="outline" className="border-gray-300 text-gray-600 bg-gray-50">
          <XCircle className="w-3 h-3 mr-1" />
          Dismissed
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function ReasonLabel({ reason }: Readonly<{ reason: string }>) {
  const labels: Record<string, string> = {
    SPAM: 'Spam',
    HARASSMENT: 'Harassment',
    INAPPROPRIATE_CONTENT: 'Inappropriate Content',
    OTHER: 'Other',
  }
  return <span>{labels[reason] || reason}</span>
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------

export function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users')

  return (
    <div className="page-wrap py-10 rise-in flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-10 h-10 text-accent" />
          <Display as="h1" id="admin-moderation-heading" data-testid="admin-moderation-title">
            Admin Moderation
          </Display>
        </div>
        <Body className="text-ink-soft max-w-xl">
          Manage platform users and review reports.
        </Body>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-line">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-accent'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </span>
          {activeTab === 'users' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'reports'
              ? 'text-accent'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Reports
          </span>
          {activeTab === 'reports' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
          )}
        </button>
      </div>

      {activeTab === 'users' ? <UserManagementTab /> : <ReportsTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT TAB
// ---------------------------------------------------------------------------

function UserManagementTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery(adminUsersQueryOptions(page))
  const toggleBan = useToggleBan()
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ user: AdminUser; action: 'ban' | 'unban' } | null>(null)

  const users = data?.results || []
  const count = data?.count || 0
  const hasNext = count > page * 50
  const hasPrev = page > 1

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleBan = (user: AdminUser) => {
    const action = user.is_banned ? 'unban' : 'ban'
    setConfirmAction({ user, action })
  }

  const executeBan = () => {
    if (!confirmAction) return
    const { user, action } = confirmAction
    toggleBan.mutate(
      { userId: user.id, isBanned: action === 'ban' },
      {
        onSuccess: () => {
          toast.success(
            action === 'ban'
              ? `${user.username} has been banned`
              : `${user.username} has been unbanned`,
          )
          setConfirmAction(null)
        },
        onError: (err) => {
          toast.error(err.message)
          setConfirmAction(null)
        },
      },
    )
  }

  return (
    <Card className="island-shell border-line bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            All Users
            {!isLoading && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
                {count}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Search by email or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Muted>No users found.</Muted>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-accent-muted/30">
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-ink-soft">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                      className={user.role === 'ADMIN' ? 'bg-accent text-white' : ''}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="w-3 h-3" />
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-ink-soft text-xs">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role !== 'ADMIN' && (
                      <Button
                        variant={user.is_banned ? 'outline' : 'destructive'}
                        size="sm"
                        className={user.is_banned
                          ? 'border-green-300 text-green-700 hover:bg-green-50'
                          : ''
                        }
                        onClick={() => handleToggleBan(user)}
                        disabled={toggleBan.isPending}
                      >
                        {user.is_banned ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5 mr-1.5" />
                            Ban
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {/* Pagination controls */}
      {(!search && (hasPrev || hasNext)) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line">
          <Muted className="text-sm">Page {page}</Muted>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Ban/Unban Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${confirmAction?.action === 'ban' ? 'text-red-500' : 'text-green-600'}`} />
              {confirmAction?.action === 'ban' ? 'Ban User' : 'Unban User'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === 'ban'
                ? `Are you sure you want to ban ${confirmAction.user.username} (${confirmAction.user.email})? They will be immediately logged out and unable to access the platform.`
                : `Are you sure you want to unban ${confirmAction?.user.username} (${confirmAction?.user.email})? They will be able to log in again.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.action === 'ban' ? 'destructive' : 'default'}
              onClick={executeBan}
              disabled={toggleBan.isPending}
              className={confirmAction?.action === 'unban' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
            >
              {toggleBan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmAction?.action === 'ban' ? (
                <>
                  <Ban className="w-4 h-4 mr-1.5" />
                  Ban User
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Unban User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// REPORTS TAB
// ---------------------------------------------------------------------------

function ReportsTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery(adminReportsQueryOptions(page))
  const resolveReport = useResolveReport()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  const reports = data?.results || []
  const count = data?.count || 0
  const hasNext = count > page * 50
  const hasPrev = page > 1

  const handleResolve = (reportId: string, newStatus: string) => {
    resolveReport.mutate(
      { reportId, status: newStatus, resolutionNote },
      {
        onSuccess: () => {
          toast.success(`Report ${newStatus.toLowerCase()}`)
          setSelectedReport(null)
          setResolutionNote('')
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <Card className="island-shell border-line bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-accent" />
          Reports
          {!isLoading && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent/15 text-accent text-xs font-bold">
              {count}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center">
            <Muted>No reports yet.</Muted>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-accent-muted/30">
                <TableHead>Reporter</TableHead>
                <TableHead>Reported User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(report => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.submitted_by.username}</TableCell>
                  <TableCell className="text-ink-soft">{report.reported_user.username}</TableCell>
                  <TableCell>
                    <ReasonLabel reason={report.reason} />
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-ink-soft text-xs">
                    {new Date(report.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report)
                        setResolutionNote(report.resolution_note || '')
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {/* Pagination controls */}
      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-line">
          <Muted className="text-sm">Page {page}</Muted>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Report Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Submitted by <strong>{selectedReport?.submitted_by.username}</strong> against <strong>{selectedReport?.reported_user.username}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-4">
              <div>
                <Muted className="text-xs uppercase tracking-wider font-bold">Reason</Muted>
                <Body className="font-medium mt-0.5">
                  <ReasonLabel reason={selectedReport?.reason ?? ''} />
                </Body>
              </div>
              <div>
                <Muted className="text-xs uppercase tracking-wider font-bold">Status</Muted>
                <div className="mt-0.5">
                  <ReportStatusBadge status={selectedReport?.status ?? ''} />
                </div>
              </div>
            </div>

            {selectedReport?.description && (
              <div>
                <Muted className="text-xs uppercase tracking-wider font-bold">Description</Muted>
                <div className="mt-1 p-3 rounded-lg bg-black/3 border border-line/50">
                  <Body className="text-sm text-ink-soft leading-relaxed italic">
                    "{selectedReport.description}"
                  </Body>
                </div>
              </div>
            )}

            <div>
              <Muted className="text-xs uppercase tracking-wider font-bold mb-1">Resolution Note</Muted>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Add a note about how this report was handled..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-y min-h-20"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            {selectedReport && selectedReport.status !== 'DISMISSED' && (
              <Button
                variant="outline"
                onClick={() => handleResolve(selectedReport.id, 'DISMISSED')}
                disabled={resolveReport.isPending}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {resolveReport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Dismiss
                  </>
                )}
              </Button>
            )}
            {selectedReport && selectedReport.status !== 'RESOLVED' && (
              <Button
                onClick={() => handleResolve(selectedReport.id, 'RESOLVED')}
                disabled={resolveReport.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {resolveReport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Resolve
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
