import { renderHook, act } from '@testing-library/react'
import { useFirestoreMessages } from './useFirestoreMessages'
import { onSnapshot } from 'firebase/firestore'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({ uid: 'test-user' })
    return vi.fn() // unsubscribe
  }),
}))

vi.mock('#/lib/firebase-client', () => ({
  getFirebaseApp: vi.fn(() => ({})),
  getFirestoreInstance: vi.fn(() => ({})),
  isFirebaseAvailable: vi.fn(() => true),
}))

describe('useFirestoreMessages hook (Web)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state and false availability if no conversationId', () => {
    const { result } = renderHook(() => useFirestoreMessages(null))
    expect(result.current.messages).toEqual([])
    expect(result.current.isFirebaseAvailable).toBe(false)
  })

  it('should set up a listener when conversationId is provided', () => {
    const mockUnsubscribe = vi.fn()
    vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe as any)

    renderHook(() => useFirestoreMessages('conv-123'))

    expect(onSnapshot).toHaveBeenCalled()
  })

  it('should update messages when snapshot returns data', async () => {
    let snapshotCallback: any
    vi.mocked(onSnapshot).mockImplementation((_query, callback: any) => {
      snapshotCallback = callback
      return vi.fn() as any // unsubscribe
    })

    const { result } = renderHook(() => useFirestoreMessages('conv-123'))

    const mockData = [
      {
        id: 'msg-1',
        data: () => ({
          id: 'msg-1',
          sender_id: 'user-1',
          sender_username: 'user1',
          body: 'Hello Web',
          created_at: '2026-05-08T10:00:00Z',
          read_receipts: {},
        }),
      },
    ]

    await act(async () => {
      snapshotCallback({
        forEach: (cb: any) => mockData.forEach(cb),
      })
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].body).toBe('Hello Web')
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle loadMore by increasing the limit', async () => {
    vi.mocked(onSnapshot).mockReturnValue(vi.fn() as any)

    const { result } = renderHook(() => useFirestoreMessages('conv-123'))

    // Reset calls from initial render
    vi.mocked(onSnapshot).mockClear()

    await act(async () => {
      result.current.loadMore()
    })

    // Verify limit was called with a higher value (implicit via query re-run)
    expect(onSnapshot).toHaveBeenCalledTimes(1)
  })
})
