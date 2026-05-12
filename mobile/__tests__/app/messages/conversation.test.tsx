import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import ConversationScreen from "@/app/messages/[conversation_id]";

const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockSubmitReportMutateAsync = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockPickMessageImageFile = jest.fn();
const mockPickMessagePdfFile = jest.fn();

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
  mentor: { username: string; display_name: string; picture_url: string | null; title?: string };
  mentee: { username: string; display_name: string; picture_url: string | null; title?: string };
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
  useMarkRead: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/lib/queries/reporting", () => ({
  useSubmitReportMutation: () => ({
    mutateAsync: mockSubmitReportMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/lib/uploads/picker", () => ({
  pickMessageImageFile: () => mockPickMessageImageFile(),
  pickMessagePdfFile: () => mockPickMessagePdfFile(),
}));

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
    mockSubmitReportMutateAsync.mockReset();
    mockInvalidateQueries.mockClear();
    mockPickMessageImageFile.mockReset();
    mockPickMessagePdfFile.mockReset();
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
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: "Hello!",
        attachment: null,
      });
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

  it("opens attachment options and sends a selected image without text", async () => {
    const image = {
      uri: "file:///tmp/photo.jpg",
      name: "photo.jpg",
      type: "image/jpeg",
    };
    mockPickMessageImageFile.mockResolvedValueOnce(image);
    mockMutateAsync.mockResolvedValueOnce(undefined);

    const { getByTestId, getByText } = renderScreen();

    fireEvent.press(getByTestId("attachment-plus-button"));
    fireEvent.press(getByTestId("attach-image-button"));

    await waitFor(() => {
      expect(getByText("photo.jpg")).toBeTruthy();
    });

    fireEvent.press(getByTestId("send-button"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: "",
        attachment: image,
      });
    });
  });

  it("selects and removes a PDF attachment", async () => {
    const pdf = {
      uri: "file:///tmp/report.pdf",
      name: "report.pdf",
      type: "application/pdf",
    };
    mockPickMessagePdfFile.mockResolvedValueOnce(pdf);

    const { getByTestId, getByText, queryByText } = renderScreen();

    fireEvent.press(getByTestId("attachment-plus-button"));
    fireEvent.press(getByTestId("attach-pdf-button"));

    await waitFor(() => {
      expect(getByText("report.pdf")).toBeTruthy();
    });

    fireEvent.press(getByTestId("selected-attachment-remove"));
    expect(queryByText("report.pdf")).toBeNull();
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

  it("does not send while another send is pending", () => {
    mockSendIsPending = true;
    const { getByTestId } = renderScreen();

    fireEvent.changeText(getByTestId("message-input"), "Hello!");
    fireEvent.press(getByTestId("send-button"));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("invalidates message and conversation queries after successful send", async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.changeText(getByTestId("message-input"), "Hello!");
    fireEvent.press(getByTestId("send-button"));

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["messaging", "messages", "conv-1"],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["messaging", "conversations"],
      });
    });
  });
});

describe("ConversationScreen — message list", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T12:00:00Z"));
    mockConversationId = "conv-1";
    mockMessagesLoading = false;
    mockMessagesError = false;
    mockSendIsPending = false;
    mockMessages = [];
    mockMutateAsync.mockReset();
    mockSubmitReportMutateAsync.mockReset();
    mockInvalidateQueries.mockClear();
    mockConversations = [
      {
        id: "conv-1",
        updated_at: "2026-04-29T12:00:00Z",
        mentor: {
          username: "mentor_user",
          display_name: "Mentor User",
          picture_url: null,
          title: "Mentor",
        },
        mentee: {
          username: "mentee_user",
          display_name: "Ada Mentee",
          picture_url: "https://example.com/ada.png",
          title: "Learner",
        },
      },
    ];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders conversation header, date separators, messages, and attachments", () => {
    mockMessages = [
      {
        id: "m-1",
        body: "Yesterday hello",
        created_at: "2026-04-28T10:00:00Z",
        sender: { username: "mentee_user" },
      },
      {
        id: "m-2",
        body: "Today reply",
        created_at: "2026-04-29T10:05:00Z",
        sender: { username: "mentor_user" },
        attachment_url: "https://example.com/file.pdf",
      },
    ];

    const { getByText, getByPlaceholderText } = renderScreen();

    expect(getByText("Ada Mentee")).toBeTruthy();
    expect(getByText("Learner")).toBeTruthy();
    expect(getByText("Yesterday")).toBeTruthy();
    expect(getByText("Today")).toBeTruthy();
    expect(getByText("Yesterday hello")).toBeTruthy();
    expect(getByText("Today reply")).toBeTruthy();
    expect(getByText("file.pdf")).toBeTruthy();
    expect(getByPlaceholderText("Message Ada…")).toBeTruthy();
  });

  it("renders the empty conversation state", () => {
    mockMessages = [];

    const { getByText } = renderScreen();

    expect(getByText("No messages yet")).toBeTruthy();
    expect(getByText("Say hello to start the conversation!")).toBeTruthy();
  });

  it("renders a skeleton header when the conversation is not in cache", () => {
    mockConversations = [];
    mockMessages = [];

    const { getByPlaceholderText } = renderScreen();

    expect(getByPlaceholderText("Type a message…")).toBeTruthy();
  });

  it("submits a report after long-pressing another user's message", async () => {
    mockSubmitReportMutateAsync.mockResolvedValueOnce({});
    mockMessages = [
      {
        id: "m-report",
        body: "Problematic message",
        created_at: "2026-04-29T10:05:00Z",
        sender: { username: "mentee_user" },
      },
    ];

    const { findByText, getByTestId, getByPlaceholderText, queryByText } =
      renderScreen();

    expect(await findByText("Problematic message")).toBeTruthy();

    fireEvent(getByTestId("message-bubble-m-report"), "longPress");
    expect(await findByText("Report message")).toBeTruthy();

    fireEvent.press(getByTestId("report-reason-SPAM"));
    fireEvent.changeText(
      getByPlaceholderText("Additional details (optional)"),
      "They keep sending spam.",
    );
    fireEvent.press(getByTestId("submit-report-button"));

    await waitFor(() => {
      expect(mockSubmitReportMutateAsync).toHaveBeenCalledWith({
        reported_username: "mentee_user",
        related_message_id: "m-report",
        reason: "SPAM",
        description: "They keep sending spam.",
      });
    });
    await waitFor(() => {
      expect(queryByText("Report message")).toBeNull();
    });
  });

  it("does not open reporting for your own messages", async () => {
    mockMessages = [
      {
        id: "m-own",
        body: "My own message",
        created_at: "2026-04-29T10:05:00Z",
        sender: { username: "mentor_user" },
      },
    ];

    const { findByText, getByTestId, queryByText } = renderScreen();

    expect(await findByText("My own message")).toBeTruthy();

    fireEvent(getByTestId("message-bubble-m-own"), "longPress");

    expect(queryByText("Report message")).toBeNull();
    expect(mockSubmitReportMutateAsync).not.toHaveBeenCalled();
  });
});
