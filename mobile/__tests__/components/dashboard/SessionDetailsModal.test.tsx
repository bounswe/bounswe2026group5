import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("SessionDetailsModal Component", () => {
  const mockSession = {
    id: "1",
    user: "Ahmet Yılmaz",
    date: "APR 01",
    rawDate: "2026-04-01",
    time: "14:00 - 15:00",
    status: "Upcoming",
    topic: "System Design Interview Prep",
    myRole: "Mentee",
    isSessionStarted: false,
  };

  const completedSession = {
    ...mockSession,
    status: "Completed",
    isSessionStarted: true,
  };

  // Set up fake timers for the setTimeout in the Reschedule button
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders action buttons for an Upcoming session", () => {
    const { getByTestId, queryByTestId } = render(
      <SessionDetailsModal
        visible={true}
        session={mockSession as any}
        onClose={jest.fn()}
        onReschedule={jest.fn()}
        onCancelSession={jest.fn()}
      />,
    );

    expect(getByTestId("action-reschedule")).toBeTruthy();
    expect(getByTestId("action-cancel")).toBeTruthy();
    expect(queryByTestId("action-leave-feedback")).toBeNull();
  });

  it("fires onClose and onReschedule when Reschedule button is pressed", () => {
    const mockOnClose = jest.fn();
    const mockOnReschedule = jest.fn();

    const { getByTestId } = render(
      <SessionDetailsModal
        visible={true}
        session={mockSession as any}
        onClose={mockOnClose}
        onReschedule={mockOnReschedule}
      />,
    );

    fireEvent.press(getByTestId("action-reschedule"));

    expect(mockOnClose).toHaveBeenCalled();

    jest.runAllTimers();
    expect(mockOnReschedule).toHaveBeenCalled();
  });

  it("hides action buttons for completed sessions", () => {
    const { queryByTestId } = render(
      <SessionDetailsModal
        visible={true}
        session={completedSession as any}
        onClose={jest.fn()}
      />,
    );

    expect(queryByTestId("action-reschedule")).toBeNull();
    expect(queryByTestId("action-cancel")).toBeNull();
  });

  it("does not render action buttons when visible is false", () => {
    const { queryByTestId } = render(
      <SessionDetailsModal
        visible={false}
        session={mockSession as any}
        onClose={jest.fn()}
      />,
    );

    expect(queryByTestId("action-reschedule")).toBeNull();
    expect(queryByTestId("action-cancel")).toBeNull();
  });

  it("shows cancel loading indicator when isCancelling is true", () => {
    const { getByTestId } = render(
      <SessionDetailsModal
        visible={true}
        session={mockSession as any}
        onClose={jest.fn()}
        isCancelling={true}
        onCancelSession={jest.fn()}
      />,
    );

    expect(getByTestId("cancel-loading-indicator")).toBeTruthy();
  });
});
