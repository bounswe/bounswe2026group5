import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  meetingSessionsQueryOptions,
  myMatchesQueryOptions,
  myRequestsQueryOptions,
  rescheduleSession,
} from '../MentorshipQueries'

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('MentorshipQueries query options', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('requests my matches with bearer auth when token exists', async () => {
    localStorage.setItem('access_token', 'token-1')

    fetchSpy.mockResolvedValueOnce(jsonResponse([{ id: 'match-1' }], { status: 200 }))

    const data = await myMatchesQueryOptions.queryFn!({} as never)

    expect(data).toEqual([{ id: 'match-1' }])

    const matchesUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(matchesUrl.pathname).toBe('/api/mentorship/matches/me/')
    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-1' },
      }),
    )
  })

  it('requests my matches with empty headers when no token exists', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ id: 'match-2' }], { status: 200 }))

    await myMatchesQueryOptions.queryFn!({} as never)

    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: {},
      }),
    )
  })

  it('throws when fetching my requests fails', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(myRequestsQueryOptions.queryFn!({} as never)).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('requests my requests with bearer auth when token exists', async () => {
    localStorage.setItem('access_token', 'token-1')
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ id: 'req-1' }], { status: 200 }))

    await myRequestsQueryOptions.queryFn!({} as never)

    const requestsUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(requestsUrl.pathname).toBe('/api/mentorship/requests/me/')
    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-1' },
      }),
    )
  })

  it('builds meeting sessions URL including role and status filters', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ session_id: 's-1' }], { status: 200 }))

    const result = await meetingSessionsQueryOptions({ role: 'mentor', status: 'upcoming' }).queryFn!({} as never)

    expect(result).toEqual([{ session_id: 's-1' }])

    const sessionsUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(sessionsUrl.pathname).toBe('/api/mentorship/meeting-sessions/me/')
    expect(sessionsUrl.searchParams.get('role')).toBe('mentor')
    expect(sessionsUrl.searchParams.get('status')).toBe('upcoming')
    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: {},
      }),
    )
  })

  it('omits role query parameter when role is all', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ session_id: 's-2' }], { status: 200 }))

    await meetingSessionsQueryOptions({ role: 'all', status: 'past' }).queryFn!({} as never)

    const allRoleUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(allRoleUrl.pathname).toBe('/api/mentorship/meeting-sessions/me/')
    expect(allRoleUrl.searchParams.get('status')).toBe('past')
    expect(allRoleUrl.searchParams.has('role')).toBe(false)
    expect(fetchSpy.mock.calls[0][1]).toEqual(expect.any(Object))
  })

  it('omits all filters when no role or status is provided', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse([{ session_id: 's-3' }], { status: 200 }))

    await meetingSessionsQueryOptions().queryFn!({} as never)

    const unfilteredUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(unfilteredUrl.pathname).toBe('/api/mentorship/meeting-sessions/me/')
    expect(unfilteredUrl.search).toBe('')
  })

  it('throws when meeting sessions API fails', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      meetingSessionsQueryOptions({ role: 'mentee', status: 'upcoming' }).queryFn!({} as never),
    ).rejects.toThrow('Something went wrong. Please try again.')
  })
})

describe('rescheduleSession', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('POSTs to the correct reschedule URL with new_slot_id in body', async () => {
    localStorage.setItem('access_token', 'tok-1')
    const mockSession = { session_id: 'sess-1', status: 'RESCHEDULED' }
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSession), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await rescheduleSession('sess-1', 'slot-42')

    expect(result).toEqual(mockSession)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(new URL(url, globalThis.location.origin).pathname).toBe(
      '/api/mentorship/sessions/sess-1/reschedule/',
    )
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ new_slot_id: 'slot-42' })
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-1')
  })

  it('includes bearer token when access_token is present', async () => {
    localStorage.setItem('access_token', 'my-token')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    await rescheduleSession('sess-2', 'slot-99')

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token')
  })

  it('sends no Authorization header when no token is present', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    await rescheduleSession('sess-3', 'slot-1')

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('throws when the API returns an error', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 403 }))

    await expect(rescheduleSession('sess-4', 'slot-2')).rejects.toThrow()
  })
})
