import { NotificationListItem } from "@/components/notifications/NotificationListItem";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{name}</Text>;
  },
}));

describe("NotificationListItem", () => {
  it("renders a request notification with view details and handles press", () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(
      <NotificationListItem
        notification={{
          id: "notif-1",
          type: "new_mentorship_request",
          title: "New request",
          message: "Mehmet Ali sent you a mentorship request.",
          isRead: false,
          createdAt: "2026-04-21T10:55:00Z",
          targetPath: "/(tabs)/connections",
        }}
        onPress={onPress}
      />,
    );

    expect(getByText("mail-open-outline")).toBeTruthy();
    expect(getByText("New request")).toBeTruthy();
    expect(getByText("Mehmet Ali sent you a mentorship request.")).toBeTruthy();
    expect(getByText("View details")).toBeTruthy();

    fireEvent.press(getByTestId("notification-item-notif-1"));
    expect(onPress).toHaveBeenCalled();
  });

  it("renders a slot booked notification without the action label when no target path exists", () => {
    const { getByText, queryByText } = render(
      <NotificationListItem
        notification={{
          id: "notif-2",
          type: "slot_booked",
          title: "Slot booked",
          message: "A mentee booked a slot on April 22, 2026.",
          isRead: false,
          createdAt: "2026-04-21T09:00:00Z",
        }}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("bookmark-outline")).toBeTruthy();
    expect(queryByText("View details")).toBeNull();
  });

  it("falls back to the default icon for unknown notification types", () => {
    const { getByText } = render(
      <NotificationListItem
        notification={{
          id: "notif-3",
          type: "unknown_event",
          title: "Platform update",
          message: "Something changed.",
          isRead: false,
          createdAt: "2026-04-21T08:00:00Z",
        }}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("notifications-outline")).toBeTruthy();
  });

  it("renders feedback notifications with the feedback icon", () => {
    const { getByText } = render(
      <NotificationListItem
        notification={{
          id: "notif-4",
          type: "new_feedback_available",
          title: "New feedback",
          message: "You received new feedback.",
          isRead: false,
          createdAt: "2026-04-21T07:30:00Z",
          targetPath: "/(tabs)/profile",
        }}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("star-outline")).toBeTruthy();
    expect(getByText("View details")).toBeTruthy();
  });
});
