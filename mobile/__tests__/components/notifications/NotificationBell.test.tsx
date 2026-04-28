import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationBadgeStore } from "@/lib/notifications/badgePreferences";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockPush = jest.fn();
const mockNotificationsQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
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

jest.mock("@/lib/queries/notifications", () => ({
  useNotificationsQuery: () => mockNotificationsQuery(),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationBadgeStore.setState({ dismissedThroughByUsername: {} });
  });

  it("shows only the unread count in the badge", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          isRead: false,
          createdAt: "2026-04-24T10:00:00.000Z",
        },
        {
          id: "notif-2",
          isRead: true,
          createdAt: "2026-04-24T10:01:00.000Z",
        },
        {
          id: "notif-3",
          isRead: false,
          createdAt: "2026-04-24T10:02:00.000Z",
        },
      ],
    });

    const { getByText } = render(<NotificationBell />);

    expect(getByText("2")).toBeTruthy();
  });

  it("hides the badge when there are no unread notifications", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          isRead: true,
          createdAt: "2026-04-24T10:00:00.000Z",
        },
      ],
    });

    const { queryByText } = render(<NotificationBell />);

    expect(queryByText("1")).toBeNull();
  });

  it("hides the current badge after pressing the bell without marking notifications read", () => {
    const unreadNotification = {
      id: "notif-1",
      isRead: false,
      createdAt: "2026-04-24T10:00:00.000Z",
    };
    mockNotificationsQuery.mockReturnValue({
      data: [unreadNotification],
    });

    const { getByTestId, queryByText, rerender } = render(
      <NotificationBell />,
    );

    expect(queryByText("1")).toBeTruthy();
    fireEvent.press(getByTestId("notification-bell-button"));
    rerender(<NotificationBell />);

    expect(unreadNotification.isRead).toBe(false);
    expect(queryByText("1")).toBeNull();
  });

  it("shows the badge again when a newer unread notification arrives", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          isRead: false,
          createdAt: "2026-04-24T10:00:00.000Z",
        },
      ],
    });

    const { getByTestId, queryByText, rerender } = render(
      <NotificationBell />,
    );

    fireEvent.press(getByTestId("notification-bell-button"));
    rerender(<NotificationBell />);
    expect(queryByText("1")).toBeNull();

    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          isRead: false,
          createdAt: "2026-04-24T10:00:00.000Z",
        },
        {
          id: "notif-2",
          isRead: false,
          createdAt: "2026-04-24T10:05:00.000Z",
        },
      ],
    });
    rerender(<NotificationBell />);

    expect(queryByText("2")).toBeTruthy();
  });

  it("navigates to the notifications screen when pressed", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [],
    });

    const { getByTestId } = render(<NotificationBell />);

    fireEvent.press(getByTestId("notification-bell-button"));

    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });
});
