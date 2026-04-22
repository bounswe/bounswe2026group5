import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { MessageCard } from "@/components/connections/MessageCard";

const baseProps = {
  id: "msg-1",
  name: "Alice",
  messagePreview: "Hey, how are you?",
  timeAgo: "2m ago",
};

describe("MessageCard — rendering", () => {
  it("renders with correct testID based on id prop", () => {
    const { getByTestId } = render(<MessageCard {...baseProps} />);
    expect(getByTestId("message-card-msg-1")).toBeTruthy();
  });

  it("does not render unread badge when hasUnread is false", () => {
    const { queryByTestId } = render(<MessageCard {...baseProps} hasUnread={false} />);
    expect(queryByTestId("message-card-unread")).toBeNull();
  });

  it("renders unread badge when hasUnread is true", () => {
    const { getByTestId } = render(<MessageCard {...baseProps} hasUnread />);
    expect(getByTestId("message-card-unread")).toBeTruthy();
  });

  it("renders different testIDs for different ids", () => {
    const { getByTestId } = render(
      <>
        <MessageCard {...baseProps} id="card-a" />
        <MessageCard {...baseProps} id="card-b" />
      </>
    );
    expect(getByTestId("message-card-card-a")).toBeTruthy();
    expect(getByTestId("message-card-card-b")).toBeTruthy();
  });
});

describe("MessageCard — interactions", () => {
  it("calls onPress when card is pressed", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<MessageCard {...baseProps} onPress={onPress} />);
    fireEvent.press(getByTestId("message-card-msg-1"));
    expect(onPress).toHaveBeenCalled();
  });
});