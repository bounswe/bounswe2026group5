// lib/queries/AdminQueries.ts
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---- Types ----

export interface AdminUser {
  id: string
  email: string
  username: string
  role: string
  is_banned: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  submitted_by: { id: string; email: string; username: string }
  reported_user: { id: string; email: string; username: string }
  reason: string
  description: string
  status: string
  resolution_note: string
  resolved_by: { id: string; email: string; username: string } | null
  created_at: string
  resolved_at: string | null
}

// ---- Query Options ----

export interface PaginatedAdminUsers {
  count: number;
  results: AdminUser[];
}

export interface PaginatedReports {
  count: number;
  results: Report[];
}

export const adminUsersQueryOptions = (page: number = 1) => queryOptions({
  queryKey: ['admin', 'users', page],
  queryFn: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/admin/users/?page=${page}&pageSize=50`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch users')
    const data = await res.json()
    return data as PaginatedAdminUsers
  },
  staleTime: 30_000,
})

export const adminReportsQueryOptions = (page: number = 1) => queryOptions({
  queryKey: ['admin', 'reports', page],
  queryFn: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/admin/reports/?page=${page}&pageSize=50`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch reports')
    const data = await res.json()
    return data as PaginatedReports
  },
  staleTime: 30_000,
})

// ---- Mutations ----

async function toggleBanFn({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const res = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ is_banned: isBanned }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to update user')
  }
  return res.json()
}

export function useToggleBan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleBanFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

async function resolveReportFn({ reportId, status, resolutionNote }: {
  reportId: string
  status: string
  resolutionNote?: string
}) {
  const res = await fetch(`${API_BASE_URL}/auth/admin/reports/${reportId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status, resolution_note: resolutionNote || '' }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to update report')
  }
  return res.json()
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resolveReportFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
  })
}

async function submitReportFn({ reportedUserId, reportedUsername, reason, description, relatedMessageId }: {
  reportedUserId?: string
  reportedUsername?: string
  reason: string
  description?: string
  relatedMessageId?: string
}) {
  const body: Record<string, unknown> = { reason, description: description || '' }
  if (reportedUserId) body.reported_user_id = reportedUserId
  if (reportedUsername) body.reported_username = reportedUsername
  if (relatedMessageId) body.related_message_id = relatedMessageId

  const res = await fetch(`${API_BASE_URL}/auth/reports/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.detail || errBody.reported_user_id?.[0] || errBody.reported_username?.[0] || 'Failed to submit report')
  }
  return res.json()
}

export function useSubmitReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitReportFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging'] })
    }
  })
}
