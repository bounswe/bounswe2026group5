import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('#/lib/firebase-client', () => ({
  isFirebaseAvailable: vi.fn(() => false),
  getFirestoreInstance: vi.fn(),
  getFirebaseApp: vi.fn(),
}))

vi.mock('#/hooks/useFirestoreMessages', () => ({
  useFirestoreMessages: vi.fn(() => ({
    messages: [],
    isLoading: false,
    isFirebaseAvailable: false,
    loadMore: vi.fn(),
    hasMore: false,
  })),
}))

vi.mock('#/hooks/useMessageQueue', () => ({
  useMessageQueue: vi.fn(() => ({ queue: [] })),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  meQueryOptions: { queryKey: ['me'], queryFn: () => null },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

import { conversationsQueryOptions, messagesQueryOptions } from '../MessagingQueries'

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('MessagingQueries fetchers', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  // ── fetchConversations ───────────────────────────────────────────────────────

  describe('fetchConversations via conversationsQueryOptions', () => {
    it('returns the parsed JSON array on a successful response', async () => {
      const mockConversations = [{ id: 'conv-1', mentor: {}, mentee: {}, unread_count: 0 }]
      fetchSpy.mockResolvedValueOnce(jsonResponse(mockConversations, { status: 200 }))

      const result = await conversationsQueryOptions.queryFn!({} as never)

      expect(result).toEqual(mockConversations)
    })

    it('calls the conversations endpoint', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([], { status: 200 }))

      await conversationsQueryOptions.queryFn!({} as never)

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toContain('/messages/conversations/')
    })

    it('sends an Authorization header when an access token is stored', async () => {
      localStorage.setItem('access_token', 'test-access-token')
      fetchSpy.mockResolvedValueOnce(jsonResponse([], { status: 200 }))

      await conversationsQueryOptions.queryFn!({} as never)

      const init = fetchSpy.mock.calls[0][1] as RequestInit
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer test-access-token',
      )
    })

    it('throws when the server returns a non-OK status', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

      await expect(conversationsQueryOptions.queryFn!({} as never)).rejects.toThrow()
    })
  })

  // ── fetchMessages ────────────────────────────────────────────────────────────

  describe('fetchMessages via messagesQueryOptions', () => {
    it('returns the parsed JSON array on a successful response', async () => {
      const mockMessages = [{ id: 'msg-1', body: 'Hello' }]
      fetchSpy.mockResolvedValueOnce(jsonResponse(mockMessages, { status: 200 }))

      const result = await messagesQueryOptions('conv-123').queryFn!({} as never)

      expect(result).toEqual(mockMessages)
    })

    it('builds the URL with conversationId, page, and pageSize parameters', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([], { status: 200 }))

      await messagesQueryOptions('conv-abc').queryFn!({} as never)

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toContain('conv-abc')
      expect(url).toContain('page=1')
      expect(url).toContain('pageSize=50')
    })

    it('sends an Authorization header when an access token is stored', async () => {
      localStorage.setItem('access_token', 'msg-access-token')
      fetchSpy.mockResolvedValueOnce(jsonResponse([], { status: 200 }))

      await messagesQueryOptions('conv-123').queryFn!({} as never)

      const init = fetchSpy.mock.calls[0][1] as RequestInit
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer msg-access-token',
      )
    })

    it('throws when the server returns a non-OK status', async () => {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }))

      await expect(messagesQueryOptions('conv-xyz').queryFn!({} as never)).rejects.toThrow()
    })
  })
})
