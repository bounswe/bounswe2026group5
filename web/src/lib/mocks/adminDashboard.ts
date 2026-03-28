// web/src/lib/mocks/adminDashboard.ts
// FUTURE: Replace with real API calls to Django admin endpoints.

export type AdminUserStatus = 'ACTIVE' | 'BANNED' | 'INACTIVE'
export type AdminReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED'
export type AdminUserRole = 'USER' | 'ADMIN'
export type AdminMentorshipMode = 'MENTOR' | 'MENTEE' | 'BOTH'

export interface MockAdminUser {
  id: string
  displayName: string
  email: string
  role: AdminUserRole
  mentorshipMode: AdminMentorshipMode
  status: AdminUserStatus
  joinedAt: string
}

export interface MockAdminReport {
  id: string
  reporterName: string
  reportedName: string
  description: string
  reportedAt: string
  status: AdminReportStatus
}

export interface AdminStats {
  totalUsers: number
  activeMentors: number
  activeMentees: number
  pendingRequests: number
  activeSessions: number
  bannedUsers: number
}

// FUTURE: Fetch from GET /api/v1/admin/stats/
export const ADMIN_STATS: AdminStats = {
  totalUsers: 142,
  activeMentors: 38,
  activeMentees: 91,
  pendingRequests: 17,
  activeSessions: 24,
  bannedUsers: 3,
}

// FUTURE: Fetch from GET /api/v1/admin/reports/
export const ADMIN_REPORTS: MockAdminReport[] = [
  {
    id: 'r1',
    reporterName: 'Berkay Kaya',
    reportedName: 'Hakan Polat',
    description: 'Inappropriate messages during session, used offensive language.',
    reportedAt: '2026-03-10T09:45:00Z',
    status: 'PENDING',
  },
  {
    id: 'r2',
    reporterName: 'Ceren Yıldız',
    reportedName: 'Deniz Arslan',
    description: 'Did not show up to two scheduled sessions without notice.',
    reportedAt: '2026-03-15T14:20:00Z',
    status: 'RESOLVED',
  },
  {
    id: 'r3',
    reporterName: 'Gizem Çelik',
    reportedName: 'Furkan Öztürk',
    description: 'Shared session materials publicly without permission.',
    reportedAt: '2026-03-20T11:00:00Z',
    status: 'PENDING',
  },
  {
    id: 'r4',
    reporterName: 'Alice Şahin',
    reportedName: 'Berkay Kaya',
    description: 'Requested money outside the platform for tutoring services.',
    reportedAt: '2026-03-22T16:30:00Z',
    status: 'DISMISSED',
  },
  {
    id: 'r5',
    reporterName: 'Ece Demir',
    reportedName: 'Hakan Polat',
    description: 'Fake credentials listed on profile, claimed expertise not verified.',
    reportedAt: '2026-03-25T08:15:00Z',
    status: 'PENDING',
  },
]

// FUTURE: Fetch from GET /api/v1/admin/users/
export const ADMIN_USERS: MockAdminUser[] = [
  {
    id: '1',
    displayName: 'Alice Şahin',
    email: 'alice@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTOR',
    status: 'ACTIVE',
    joinedAt: '2025-09-12T10:00:00Z',
  },
  {
    id: '2',
    displayName: 'Berkay Kaya',
    email: 'berkay@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTEE',
    status: 'ACTIVE',
    joinedAt: '2025-10-03T14:22:00Z',
  },
  {
    id: '3',
    displayName: 'Ceren Yıldız',
    email: 'ceren@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'BOTH',
    status: 'ACTIVE',
    joinedAt: '2025-10-18T09:15:00Z',
  },
  {
    id: '4',
    displayName: 'Deniz Arslan',
    email: 'deniz@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTEE',
    status: 'BANNED',
    joinedAt: '2025-11-01T16:40:00Z',
  },
  {
    id: '5',
    displayName: 'Ece Demir',
    email: 'ece@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTOR',
    status: 'ACTIVE',
    joinedAt: '2025-11-20T11:05:00Z',
  },
  {
    id: '6',
    displayName: 'Furkan Öztürk',
    email: 'furkan@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'BOTH',
    status: 'INACTIVE',
    joinedAt: '2025-12-05T08:30:00Z',
  },
  {
    id: '7',
    displayName: 'Gizem Çelik',
    email: 'gizem@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTEE',
    status: 'ACTIVE',
    joinedAt: '2026-01-10T13:00:00Z',
  },
  {
    id: '8',
    displayName: 'Hakan Polat',
    email: 'hakan@boun.edu.tr',
    role: 'USER',
    mentorshipMode: 'MENTOR',
    status: 'BANNED',
    joinedAt: '2026-01-22T17:20:00Z',
  },
]
