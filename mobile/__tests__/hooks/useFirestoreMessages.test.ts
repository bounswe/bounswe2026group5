import { renderHook, act } from '@testing-library/react-native';
import { useFirestoreMessages } from '@/hooks/useFirestoreMessages';
import { onSnapshot } from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'test-user' });
    return jest.fn(); // unsubscribe
  }),
}));

jest.mock('@/lib/firebase-client', () => ({
  getFirebaseApp: jest.fn(() => ({})),
  getFirestoreInstance: jest.fn(() => ({})),
  isFirebaseAvailable: jest.fn(() => true),
}));

describe('useFirestoreMessages hook', () => {
  it('should initialize with loading state and false availability if no conversationId', () => {
    const { result } = renderHook(() => useFirestoreMessages(null));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isFirebaseAvailable).toBe(false);
  });

  it('should set up a listener when conversationId is provided', () => {
    const mockUnsubscribe = jest.fn();
    (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

    renderHook(() => useFirestoreMessages('conv-123'));

    expect(onSnapshot).toHaveBeenCalled();
  });

  it('should update messages when snapshot returns data', () => {
    let snapshotCallback: any;
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      snapshotCallback = callback;
      return jest.fn(); // unsubscribe
    });

    const { result } = renderHook(() => useFirestoreMessages('conv-123'));

    const mockData = [
      {
        id: 'msg-1',
        data: () => ({
          id: 'msg-1',
          sender_id: 'user-1',
          sender_username: 'user1',
          body: 'Hello',
          created_at: '2026-05-08T10:00:00Z',
          read_receipts: {},
        }),
      },
    ];

    act(() => {
      snapshotCallback({
        forEach: (cb: any) => mockData.forEach(cb),
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].body).toBe('Hello');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle loadMore by increasing the limit', () => {
    (onSnapshot as jest.Mock).mockReturnValue(jest.fn());

    const { result } = renderHook(() => useFirestoreMessages('conv-123'));

    // Reset calls from initial render
    (onSnapshot as jest.Mock).mockClear();

    act(() => {
      result.current.loadMore();
    });

    // Verify limit was called with a higher value (implicit via query re-run)
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });
});
