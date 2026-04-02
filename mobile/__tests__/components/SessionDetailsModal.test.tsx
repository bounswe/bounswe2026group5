import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

// Mock the icons
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
    location: "Campus Library, Room 4B",
  };

  // Set up fake timers for the setTimeout in your Reschedule button
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the session details correctly when visible", () => {
    const { getByText } = render(
      <SessionDetailsModal
        visible={true}
        session={mockSession as any}
        onClose={jest.fn()}
        onReschedule={jest.fn()}
      />,
    );

    // Verify core info rendered (removed the false "Session Details" header check)
    expect(getByText("System Design Interview Prep")).toBeTruthy();
    expect(getByText('with Ahmet Yılmaz')).toBeTruthy();
    expect(getByText("14:00 - 15:00")).toBeTruthy();
    expect(getByText("Campus Library, Room 4B")).toBeTruthy();

    // Verify our action buttons are present
    expect(getByText("Reschedule")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("triggers onClose and onReschedule when the Reschedule button is pressed", () => {
    const mockOnClose = jest.fn();
    const mockOnReschedule = jest.fn();

    const { getByText } = render(
      <SessionDetailsModal
        visible={true}
        session={mockSession as any}
        onClose={mockOnClose}
        onReschedule={mockOnReschedule}
      />,
    );

    // Press the Reschedule button
    fireEvent.press(getByText("Reschedule"));

    // Verify onClose is called immediately
    expect(mockOnClose).toHaveBeenCalled();

    // Fast-forward the 300ms setTimeout to trigger the BookingModal
    jest.runAllTimers();

    // Verify onReschedule was called after the delay
    expect(mockOnReschedule).toHaveBeenCalled();
  });

  it("does not render content when visible is false", () => {
    const { queryByText } = render(
      <SessionDetailsModal
        visible={false}
        session={mockSession as any}
        onClose={jest.fn()}
      />,
    );

    expect(queryByText("System Design Interview Prep")).toBeNull();
  });
});
