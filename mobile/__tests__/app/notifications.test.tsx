import NotificationsScreen from "@/app/notifications";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import { ApiError } from "@/lib/api/client";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockMutateAsync = jest.fn();
const mockNotificationsQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: {
        username: "student",
      },
    }),
}));

jest.mock("@/lib/queries/notifications", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/notifications",
  );

  return {
    ...actual,
    useNotificationsQuery: () => mockNotificationsQuery(),
    useMarkNotificationReadMutation: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

describe("NotificationsScreen", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          type: "incoming_message",
          title: "New message",
          message: "Ada sent you a new message.",
          isRead: false,
          createdAt: "2026-04-20T11:30:00Z",
          targetPath: "/(tabs)/connections",
        },
      ],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
    mockMutateAsync.mockResolvedValue({ detail: "Notification marked as read." });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("renders notifications and navigates after marking one as read", async () => {
    const { getByText, getByTestId } = render(<NotificationsScreen />);

    expect(getByText("Notifications")).toBeTruthy();
    expect(getByText("Ada sent you a new message.")).toBeTruthy();

    fireEvent.press(getByTestId("notification-item-notif-1"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("notif-1");
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/connections");
    });
  });

  it("shows the caught-up empty state when there are no notifications", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText("You're all caught up")).toBeTruthy();
  });

  it("shows a loading state while notifications are being fetched", () => {
    mockNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText("Loading notifications...")).toBeTruthy();
  });

  it("shows a polished retry state for server errors", () => {
    mockNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(500, "Request failed with status 500"),
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText("Could not load notifications.")).toBeTruthy();
    expect(
      getByText(
        "Notifications are temporarily unavailable. Please try again in a moment.",
      ),
    ).toBeTruthy();
  });

  it("shows a session-expired retry state for unauthorized errors", () => {
    mockNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(401, "Unauthorized"),
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(
      getByText("Your session may have expired. Please sign in again and retry."),
    ).toBeTruthy();
  });

  it("shows a connection timeout retry state", () => {
    mockNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Request timed out"),
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(
      getByText(
        "We could not reach the server in time. Check your connection and try again.",
      ),
    ).toBeTruthy();
  });

  it("retries loading notifications when pressing Try Again", () => {
    mockNotificationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: mockRefetch,
    });

    const { getByText } = render(<NotificationsScreen />);

    fireEvent.press(getByText("Try Again"));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("goes back from the header button", () => {
    const { getByTestId } = render(<NotificationsScreen />);

    fireEvent.press(getByTestId("notifications-back-button"));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("alerts when marking a notification as read fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Could not mark read."));

    const { getByTestId } = render(<NotificationsScreen />);

    fireEvent.press(getByTestId("notification-item-notif-1"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Notification Update Failed",
        "Could not mark read.",
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
