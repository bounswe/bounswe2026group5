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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with available slots", () => {
    const { getByText } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    expect(getByText("Reschedule Session")).toBeTruthy();
    // Your code intelligently renders "1 available slot" instead of "1 available slots"
    expect(getByText(/1 available slot/i)).toBeTruthy(); 
    // Your actual button text
    expect(getByText("Keep Current Slot")).toBeTruthy(); 
  });

  it("shows loading state when isLoading is true", () => {
    const { getByText } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={[]}
        isLoading={true}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    // Look for the actual loading text your component renders!
    expect(getByText(/Loading available slots.../i)).toBeTruthy(); 
  });

  it("calls onClose when Keep Current Slot is pressed", () => {
    const { getByText } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    fireEvent.press(getByText("Keep Current Slot"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("fires onSelectSlot with the correct ID when a user taps a specific time", () => {
    const { getByText } = render(
      <RescheduleBottomSheet
        visible={true}
        onClose={mockOnClose}
        slots={mockSlots}
        onSelectSlot={mockOnSelectSlot}
      />
    );

    // Find the slot by the text that renders
    const slotButton = getByText(/10:00/i); 
    
    // Simulate user tap
    fireEvent.press(slotButton);

    // Verify it sent the exact ID to your backend mutation handler
    expect(mockOnSelectSlot).toHaveBeenCalledWith("slot-xyz-123");
    expect(mockOnSelectSlot).toHaveBeenCalledTimes(1);
  });
});