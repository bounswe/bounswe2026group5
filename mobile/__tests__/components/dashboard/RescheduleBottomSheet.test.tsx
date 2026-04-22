import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RescheduleBottomSheet } from "@/components/dashboard/RescheduleBottomSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("RescheduleBottomSheet", () => {
  const mockOnClose = jest.fn();
  const mockOnSelectSlot = jest.fn();

  const mockSlots = [
    {
      id: "slot-xyz-123",
      date: "2026-05-10",
      startTime: "10:00:00",
      endTime: "11:00:00",
      is_booked: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders available slot and keep-current button", () => {
    const { getByTestId } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    expect(getByTestId("slot-slot-xyz-123")).toBeTruthy();
    expect(getByTestId("keep-current-slot-button")).toBeTruthy();
  });

  it("shows loading state when isLoading is true", () => {
    const { getByTestId } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={[]}
        isLoading={true}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    expect(getByTestId("loading-state")).toBeTruthy();
  });

  it("shows empty state when no slots and not loading", () => {
    const { getByTestId } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={[]}
        isLoading={false}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    expect(getByTestId("empty-slots-state")).toBeTruthy();
  });

  it("calls onClose when keep-current button is pressed", () => {
    const { getByTestId } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    fireEvent.press(getByTestId("keep-current-slot-button"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("fires onSelectSlot with correct slot ID when a slot is pressed", () => {
    const { getByTestId } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    fireEvent.press(getByTestId("slot-slot-xyz-123"));
    expect(mockOnSelectSlot).toHaveBeenCalledWith("slot-xyz-123");
    expect(mockOnSelectSlot).toHaveBeenCalledTimes(1);
  });
});