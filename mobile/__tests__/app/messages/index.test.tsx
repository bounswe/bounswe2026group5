import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefetch = jest.fn();

let mockIsLoading = false;
let mockIsError = false;
let mockConversations: Array<{
  id: string;
  updated_at: string;
  mentor: { username: string; display_name: string; picture_url: null; title?: string };
  mentee: { username: string; display_name: string; picture_url: null; title?: string };
}> = [];

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (s: { user: { username: string } | null }) => unknown) =>
    selector({ user: { username: "mentor_user" } }),
}));

jest.mock("@/lib/queries/MessagingQueries", () => ({
  useConversations: () => ({
    data: mockConversations,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetch,
  }),
}));

import MessagesScreen from "@/app/messages/index";

function makeConversation(id: string, menteeDisplayName: string, menteeUsername: string) {
  return {
    id,
    updated_at: "2024-01-01T12:00:00Z",
    mentor: { username: "mentor_user", display_name: "Mentor", picture_url: null },
    mentee: { username: menteeUsername, display_name: menteeDisplayName, picture_url: null },
  };
}

function renderScreen() {
  return render(<MessagesScreen />);
}

describe("MessagesScreen — loading state", () => {
  it("renders loading indicator when isLoading is true", () => {
    mockIsLoading = true;
    mockIsError = false;
    mockConversations = [];
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-loading")).toBeTruthy();
  });
});

describe("MessagesScreen — error state", () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = true;
    mockConversations = [];
    mockRefetch.mockClear();
  });

  it("renders error view when isError is true", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-error")).toBeTruthy();
  });

  it("renders retry button in error state", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-retry")).toBeTruthy();
  });

  it("calls refetch when retry is pressed", () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("messages-retry"));
    expect(mockRefetch).toHaveBeenCalled();
  });
});

describe("MessagesScreen — empty state", () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = false;
    mockConversations = [];
  });

  it("renders empty state when conversations list is empty", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("messages-empty")).toBeTruthy();
  });
});

describe("MessagesScreen — conversation list", () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = false;
    mockConversations = [
      makeConversation("conv-1", "Alice Smith", "alice"),
      makeConversation("conv-2", "Bob Jones", "bob"),
    ];
    mockPush.mockClear();
  });

  it("renders conversation items", () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId("conversation-item-conv-1")).toBeTruthy();
    expect(getByTestId("conversation-item-conv-2")).toBeTruthy();
  });

  it("navigates to conversation screen when item is pressed", async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("conversation-item-conv-1"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/messages/conv-1");
    });
  });
});

describe("MessagesScreen — search filtering", () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = false;
    mockConversations = [
      makeConversation("conv-1", "Alice Smith", "alice"),
      makeConversation("conv-2", "Bob Jones", "bob"),
    ];
  });

  it("filters conversations by display name", () => {
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("messages-search"), "Alice");
    expect(getByTestId("conversation-item-conv-1")).toBeTruthy();
    expect(queryByTestId("conversation-item-conv-2")).toBeNull();
  });

  it("filters conversations by username", () => {
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("messages-search"), "bob");
    expect(getByTestId("conversation-item-conv-2")).toBeTruthy();
    expect(queryByTestId("conversation-item-conv-1")).toBeNull();
  });

  it("shows empty search state when search yields no results", () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("messages-search"), "zzznomatch");
    expect(getByTestId("messages-empty-search")).toBeTruthy();
  });

  it("shows all conversations when search is cleared", () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId("messages-search"), "Alice");
    fireEvent.changeText(getByTestId("messages-search"), "");
    expect(getByTestId("conversation-item-conv-1")).toBeTruthy();
    expect(getByTestId("conversation-item-conv-2")).toBeTruthy();
  });
});