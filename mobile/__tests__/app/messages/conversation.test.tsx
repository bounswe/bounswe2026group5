import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockInvalidateQueries = jest.fn();

let mockConversationId = "conv-1";
let mockMessagesLoading = false;
let mockMessagesError = false;
let mockMessages: Array<{
  id: string;
  body: string;
  created_at: string;
  sender: { username: string };
  attachment_url?: string | null;
}> = [];
let mockConversations: Array<{
  id: string;
  updated_at: string;
  mentor: { username: string; display_name: string; picture_url: null; title?: string };
  mentee: { username: string; display_name: string; picture_url: null; title?: string };
}> = [];
let mockSendIsPending = false;

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ conversation_id: mockConversationId }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (s: { user: { username: string } | null }) => unknown) =>
    selector({ user: { username: "mentor_user" } }),
}));

jest.mock("@/lib/queries/MessagingQueries", () => ({
  useConversations: () => ({ data: mockConversations }),
  useMessages: () => ({
    data: mockMessages,
    isLoading: mockMessagesLoading,
    isError: mockMessagesError,
  }),
  useSendMessage: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockSendIsPending,
  }),
}));

import ConversationScreen from "@/app/messages/[conversation_id]";

function renderScreen() {
  return render(<ConversationScreen />);
}

describe("ConversationScreen — loading state", () => {
  it("renders loading indicator when messages are loading", () => {
    mockMessagesLoading = true;
    mockMessagesError = false;
    mockMessages = [];
    mockConversations = [];
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-loading")).toBeTruthy();
  });
});

describe("ConversationScreen — error state", () => {
  it("renders error view when messages fail to load", () => {
    mockMessagesLoading = false;
    mockMessagesError = true;
    mockMessages = [];
    mockConversations = [];
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-error")).toBeTruthy();
  });
});

describe("ConversationScreen — back navigation", () => {
  beforeEach(() => {
    mockMessagesLoading = false;
    mockMessagesError = false;
    mockMessages = [];
    mockConversations = [];
    mockBack.mockClear();
  });

  it("calls router.back when back button is pressed", () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("back-button"));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe("ConversationScreen — message input", () => {
  beforeEach(() => {
    mockMessagesLoading = false;
    mockMessagesError = false;
    mockMessages = [];
    mockConversations = [];
    mockSendIsPending = false;
    mockMutateAsync.mockReset();
    mockInvalidateQueries.mockClear();
  });

  it("renders message input", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("message-input")).toBeTruthy();
  });

  it("renders send button", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("send-button")).toBeTruthy();
  });

  it("updates input text when user types", () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("message-input"), "Hello!");
    expect(getByTestId("message-input").props.value).toBe("Hello!");
  });

  it("calls mutateAsync with trimmed text when send is pressed", async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("message-input"), "  Hello!  ");
    fireEvent.press(getByTestId("send-button"));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("Hello!");
    });
  });

  it("clears input after successful send", async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("message-input"), "Hello!");
    fireEvent.press(getByTestId("send-button"));
    await waitFor(() => {
      expect(getByTestId("message-input").props.value).toBe("");
    });
  });

  it("does not call mutateAsync when input is empty", () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("send-button"));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("restores text if send fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("message-input"), "Hello!");
    fireEvent.press(getByTestId("send-button"));
    await waitFor(() => {
      expect(getByTestId("message-input").props.value).toBe("Hello!");
    });
  });
});