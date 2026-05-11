import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMarkRead } from '@/lib/queries/MessagingQueries';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/lib/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPostMultipart: jest.fn(),
}));

jest.mock('@/lib/firebase-client', () => ({
  isFirebaseAvailable: jest.fn(() => true),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useMarkRead hook', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('optimistically updates unread_count to 0 on mutate', async () => {
    const conversationId = 'conv-1';
    const initialData = [
      { id: 'conv-1', unread_count: 5 },
      { id: 'conv-2', unread_count: 2 },
    ];

    queryClient.setQueryData(['messaging', 'conversations'], initialData);

    (apiPost as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useMarkRead(conversationId), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    const updatedData = queryClient.getQueryData(['messaging', 'conversations']) as any[];
    expect(updatedData[0].unread_count).toBe(0);
    expect(updatedData[1].unread_count).toBe(2); // Others unchanged
  });

  it('rolls back unread_count on error', async () => {
    const conversationId = 'conv-1';
    const initialData = [{ id: 'conv-1', unread_count: 10 }];
    queryClient.setQueryData(['messaging', 'conversations'], initialData);

    (apiPost as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useMarkRead(conversationId), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch (e) {}
    });

    // Should rollback to initial state
    const currentData = queryClient.getQueryData(['messaging', 'conversations']) as any[];
    expect(currentData[0].unread_count).toBe(10);
  });
});
