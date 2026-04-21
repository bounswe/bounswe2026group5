import { NotificationBell } from "@/components/notifications/NotificationBell";
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
  });

  it("shows only the unread count in the badge", () => {
    mockNotificationsQuery.mockReturnValue({
      data: [
        {
          id: "notif-1",
          isRead: false,
        },
        {
          id: "notif-2",
          isRead: true,
        },
        {
          id: "notif-3",
          isRead: false,
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
        },
      ],
    });

    const { queryByText } = render(<NotificationBell />);

    expect(queryByText("1")).toBeNull();
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
