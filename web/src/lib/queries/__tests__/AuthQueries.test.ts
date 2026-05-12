import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { queryClientClearMock, queryClientSetDataMock, navigateMock } = vi.hoisted(() => ({
  queryClientClearMock: vi.fn(),
  queryClientSetDataMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('#/router.tsx', () => ({
  router: {
    navigate: navigateMock,
  },
}))

vi.mock('#/queryClient.ts', () => ({
  queryClient: {
    clear: queryClientClearMock,
    setQueryData: queryClientSetDataMock,
  },
}))

import {
    getStoredUser,
    handleAuthSuccess,
    loginFn,
    logout,
    meQueryOptions,
    registerFn,
    updateAppUsageModeFn,
    verifyEmailFn,
    resendVerificationEmailFn,
} from '../AuthQueries'

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('AuthQueries', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('returns null from me query when there is no access token', async () => {
    const result = await meQueryOptions.queryFn!({} as never)

    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refreshes expired access token and retries me query', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'refresh-token')

    const me = {
      id: 'user-1',
      username: 'alex',
      email: 'alex@example.com',
      role: 'USER',
      auth_provider: 'LOCAL',
      app_usage_mode: 'MENTOR',
      is_active: true,
      is_email_verified: true,
      created_at: '2026-04-10T09:00:00Z',
    }

    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ access: 'fresh-token' }, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(me, { status: 200 }))

    const result = await meQueryOptions.queryFn!({} as never)

    expect(result).toEqual(me)
    expect(localStorage.getItem('access_token')).toBe('fresh-token')

    const retryUrl = new URL(fetchSpy.mock.calls[2][0] as string, globalThis.location.origin)
    expect(retryUrl.pathname).toBe('/api/auth/me/')
    expect(fetchSpy.mock.calls[2][1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer fresh-token' },
      }),
    )
  })

  it('clears auth state and redirects to login when token refresh fails', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'invalid-refresh')
    localStorage.setItem('id', 'user-1')

    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))

    const result = await meQueryOptions.queryFn!({} as never)

    expect(result).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('id')).toBeNull()
    expect(queryClientClearMock).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/login' })
  })

  it('returns null when access token is expired and no refresh token exists', async () => {
    localStorage.setItem('access_token', 'expired-token')

    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(meQueryOptions.queryFn!({} as never)).resolves.toBeNull()
    expect(queryClientClearMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('returns null when retrying me query fails after successful refresh', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'refresh-token')

    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ access: 'fresh-token' }, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(meQueryOptions.queryFn!({} as never)).resolves.toBeNull()
    expect(localStorage.getItem('access_token')).toBe('fresh-token')
  })

  it('returns stored user id when access token exists', () => {
    localStorage.setItem('access_token', 'token-1')
    localStorage.setItem('id', 'user-123')

    expect(getStoredUser()).toEqual({ id: 'user-123' })
  })

  it('returns an empty user object when token exists but id is missing', () => {
    localStorage.setItem('access_token', 'token-1')

    expect(getStoredUser()).toEqual({})
  })

  it('stores tokens and hydrates me cache on auth success', () => {
    const data = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: {
        id: 'user-1',
        username: 'alex',
        email: 'alex@example.com',
        role: 'USER',
        auth_provider: 'LOCAL',
        app_usage_mode: 'MENTEE' as const,
        is_active: true,
        is_email_verified: true,
        created_at: '2026-04-10T09:00:00Z',
      },
    }

    handleAuthSuccess(data)

    expect(localStorage.getItem('access_token')).toBe('token-1')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-1')
    expect(localStorage.getItem('id')).toBe('user-1')
    expect(queryClientSetDataMock).toHaveBeenCalledWith(['me'], data.user)
  })

  it('throws meaningful errors for failed login and register calls', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }))

    await expect(
      loginFn({ email: 'alex@example.com', password: 'bad-password' }),
    ).rejects.toThrow('Something went wrong. Please try again.')

    await expect(
      registerFn({
        email: 'alex@example.com',
        password: 'short',
        confirm_password: 'short',
      }),
    ).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('returns payload for successful login and register calls', async () => {
    const authPayload = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: {
        id: 'user-1',
        username: 'alex',
        email: 'alex@example.com',
        role: 'USER',
        auth_provider: 'LOCAL',
        app_usage_mode: 'MENTEE' as const,
        is_active: true,
        is_email_verified: true,
        created_at: '2026-04-10T09:00:00Z',
      },
    }

    fetchSpy
      .mockResolvedValueOnce(jsonResponse(authPayload, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(authPayload, { status: 200 }))

    await expect(loginFn({ email: 'alex@example.com', password: 'pass123456' })).resolves.toEqual(authPayload)
    await expect(
      registerFn({
        email: 'alex@example.com',
        password: 'pass123456',
        confirm_password: 'pass123456',
      }),
    ).resolves.toEqual(authPayload)
  })

  it('logs out locally even when logout endpoint request fails', async () => {
    localStorage.setItem('access_token', 'token-1')
    localStorage.setItem('refresh_token', 'refresh-1')
    localStorage.setItem('id', 'user-1')

    fetchSpy.mockRejectedValueOnce(new Error('network down'))

    await logout()

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('id')).toBeNull()
    expect(queryClientClearMock).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/login' })
  })

  it('logs out without calling backend when refresh token is missing', async () => {
    localStorage.setItem('access_token', 'token-1')

    await logout()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(queryClientClearMock).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/login' })
  })

  // ── verifyEmailFn ──────────────────────────────────────────────────────────

  describe('verifyEmailFn', () => {
    it('sends a GET request with the token as a query parameter', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ detail: 'verified' }, { status: 200 }))

      await verifyEmailFn('my-token-123')

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('token=my-token-123'),
      )
    })

    it('resolves with the response body on success', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ detail: 'verified' }, { status: 200 }))

      await expect(verifyEmailFn('good-token')).resolves.toEqual({ detail: 'verified' })
    })

    it('throws when the token is invalid or expired (400)', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 400 }))

      await expect(verifyEmailFn('expired-token')).rejects.toThrow()
    })

    it('percent-encodes the token so base64 padding characters are safe', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, { status: 200 }))

      await verifyEmailFn('abc==')

      const calledUrl = (fetchSpy.mock.calls[0] as [string])[0]
      expect(calledUrl).toContain('abc%3D%3D')
    })
  })

  // ── resendVerificationEmailFn ──────────────────────────────────────────────

  describe('resendVerificationEmailFn', () => {
    it('sends a POST to the resend endpoint using the stored access token', async () => {
      localStorage.setItem('access_token', 'bearer-token')
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ detail: 'If your email is unverified, a new verification link has been sent.' }, { status: 200 }),
      )

      await resendVerificationEmailFn()

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('resend-verification')
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer bearer-token')
      expect(init.method).toBe('POST')
    })

    it('resolves with the response body on success', async () => {
      localStorage.setItem('access_token', 'bearer-token')
      const body = { detail: 'If your email is unverified, a new verification link has been sent.' }
      fetchSpy.mockResolvedValueOnce(jsonResponse(body, { status: 200 }))

      await expect(resendVerificationEmailFn()).resolves.toEqual(body)
    })

    it('throws when the server returns a non-OK status', async () => {
      localStorage.setItem('access_token', 'bearer-token')
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }))

      await expect(resendVerificationEmailFn()).rejects.toThrow()
    })
  })

  it('updates app usage mode and throws when update fails', async () => {
    localStorage.setItem('access_token', 'token-1')

    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ app_usage_mode: 'MENTOR' }, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      updateAppUsageModeFn({ app_usage_mode: 'MENTOR' }),
    ).resolves.toEqual({ app_usage_mode: 'MENTOR' })

    await expect(
      updateAppUsageModeFn({ app_usage_mode: 'MENTEE' }),
    ).rejects.toThrow('Something went wrong. Please try again.')
  })
})
