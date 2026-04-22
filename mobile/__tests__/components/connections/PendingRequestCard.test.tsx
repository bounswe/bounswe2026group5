import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { PendingRequestCard } from "@/components/connections/PendingRequestCard";

const baseProps = {
  id: "req-1",
  name: "Alice Smith",
  cover_letter: "I would love to learn from you.",
  slot_date: null,
  slot_start_time: null,
  slot_end_time: null,
};

describe("PendingRequestCard — rendering", () => {
  it("renders the card", () => {
    const { getByTestId } = render(<PendingRequestCard {...baseProps} />);
    expect(getByTestId("pending-request-card")).toBeTruthy();
  });

  it("does not render new badge when isNew is false", () => {
    const { queryByTestId } = render(<PendingRequestCard {...baseProps} isNew={false} />);
    expect(queryByTestId("pending-new-badge")).toBeNull();
  });

  it("renders new badge when isNew is true", () => {
    const { getByTestId } = render(<PendingRequestCard {...baseProps} isNew />);
    expect(getByTestId("pending-new-badge")).toBeTruthy();
  });

  it("renders decline and accept buttons", () => {
    const { getByTestId } = render(<PendingRequestCard {...baseProps} />);
    expect(getByTestId("pending-decline-button")).toBeTruthy();
    expect(getByTestId("pending-accept-button")).toBeTruthy();
  });
});

describe("PendingRequestCard — interactions", () => {
  it("calls onPress when card is pressed", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<PendingRequestCard {...baseProps} onPress={onPress} />);
    fireEvent.press(getByTestId("pending-request-card"));
    expect(onPress).toHaveBeenCalled();
  });

  it("calls onDecline when decline button is pressed", () => {
    const onDecline = jest.fn();
    const { getByTestId } = render(<PendingRequestCard {...baseProps} onDecline={onDecline} />);
    fireEvent.press(getByTestId("pending-decline-button"));
    expect(onDecline).toHaveBeenCalled();
  });

  it("calls onAccept when accept button is pressed", () => {
    const onAccept = jest.fn();
    const { getByTestId } = render(<PendingRequestCard {...baseProps} onAccept={onAccept} />);
    fireEvent.press(getByTestId("pending-accept-button"));
    expect(onAccept).toHaveBeenCalled();
  });
});

describe("PendingRequestCard — disabled state", () => {
  it("disables decline button when disabled is true", () => {
    const { getByTestId } = render(<PendingRequestCard {...baseProps} disabled />);
    expect(getByTestId("pending-decline-button").props.accessibilityState?.disabled).toBe(true);
  });

  it("disables accept button when disabled is true", () => {
    const { getByTestId } = render(<PendingRequestCard {...baseProps} disabled />);
    expect(getByTestId("pending-accept-button").props.accessibilityState?.disabled).toBe(true);
  });
});