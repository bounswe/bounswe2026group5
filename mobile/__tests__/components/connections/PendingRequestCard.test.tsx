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

  it("renders pending state without action buttons for outgoing requests", () => {
    const { getByTestId, queryByTestId } = render(
      <PendingRequestCard {...baseProps} requestType="outgoing" />,
    );
    expect(getByTestId("pending-outgoing-badge")).toBeTruthy();
    expect(queryByTestId("pending-decline-button")).toBeNull();
    expect(queryByTestId("pending-accept-button")).toBeNull();
  });

  it("renders reschedule badge when request is a reschedule", () => {
    const { getByTestId } = render(
      <PendingRequestCard {...baseProps} isReschedule />,
    );
    expect(getByTestId("pending-reschedule-badge")).toBeTruthy();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    const { getByTestId, queryByTestId } = render(
      <PendingRequestCard
        {...baseProps}
        avatarUrl="https://cdn.example.com/alice.jpg"
      />,
    );

    expect(getByTestId("pending-avatar-image")).toBeTruthy();
    expect(queryByTestId("pending-avatar-fallback")).toBeNull();
  });

  it("falls back to initials when avatarUrl is missing", () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <PendingRequestCard {...baseProps} />,
    );

    expect(getByTestId("pending-avatar-fallback")).toBeTruthy();
    expect(queryByTestId("pending-avatar-image")).toBeNull();
    expect(getByText("AS")).toBeTruthy();
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

  it("calls onShowProfile when avatar is pressed", () => {
    const onShowProfile = jest.fn();
    const { getByTestId } = render(
      <PendingRequestCard {...baseProps} onShowProfile={onShowProfile} />,
    );
    fireEvent.press(getByTestId("pending-profile-button"));
    expect(onShowProfile).toHaveBeenCalled();
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
