import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessagesPage } from '../messages'

globalThis.HTMLElement.prototype.scrollIntoView = vi.fn()

const { mockUseConversations, mockUseMessages, mockUseSendMessage } = vi.hoisted(() => ({
  mockUseConversations: vi.fn(),
  mockUseMessages: vi.fn(),
  mockUseSendMessage: vi.fn(),
}))

vi.mock('#/lib/queries/MessagingQueries.ts', () => ({
  useConversations: () => mockUseConversations(),
  useMessages: (id: string) => mockUseMessages(id),
  useSendMessage: (id: string) => mockUseSendMessage(id),
}))

vi.mock('#/lib/queries/AuthQueries.ts', () => ({
  meQueryOptions: { queryKey: ['me'], queryFn: () => ({ username: 'testuser' }) },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    useSearch: () => ({ conversationId: '' }),
  }),
}))

vi.mock('#/lib/queries/NotificationQueries.ts', () => ({
  useNotifications: () => ({ data: [] }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
}))

const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    mentor: { username: 'testuser', display_name: 'Test Mentor', picture_url: '' },
    mentee: { username: 'otheruser', display_name: 'Other Mentee', picture_url: '' },
  }
]

const MOCK_MESSAGES = [
  {
    id: 'msg-1',
    body: 'Hello world',
    sender: { username: 'otheruser', display_name: 'Other Mentee', picture_url: '' },
    created_at: '2026-04-20T10:00:00Z',
  }
]

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['me'], { username: 'testuser' })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConversations.mockReturnValue({ data: MOCK_CONVERSATIONS, isLoading: false })
    mockUseMessages.mockReturnValue({ data: MOCK_MESSAGES, isLoading: false })
    mockUseSendMessage.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('renders the conversation list', () => {
    renderWithQueryClient(<MessagesPage />)
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Other Mentee')).toBeInTheDocument()
  })

  it('shows empty state when no conversation is selected', () => {
    renderWithQueryClient(<MessagesPage />)
    expect(screen.getByText(/Select a conversation to start messaging/i)).toBeInTheDocument()
  })

  it('renders messages when a conversation is selected', () => {
    renderWithQueryClient(<MessagesPage />)
    
    const conversation = screen.getByText('Other Mentee')
    fireEvent.click(conversation)
    
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('can send a message', () => {
    const mockMutate = vi.fn()
    mockUseSendMessage.mockReturnValue({ mutateAsync: mockMutate, isPending: false })
    
    renderWithQueryClient(<MessagesPage />)
    
    // Select conversation
    fireEvent.click(screen.getByText('Other Mentee'))
    
    const input = screen.getByPlaceholderText(/Type a message/i)
    fireEvent.change(input, { target: { value: 'New message' } })
    
    const sendButton = screen.getByRole('button', { name: /send message/i })
    fireEvent.click(sendButton)
    
    expect(mockMutate).toHaveBeenCalledWith('New message')
  })
})
