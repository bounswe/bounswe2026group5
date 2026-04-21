import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { BookingModal } from "@/components/profile/BookingModal";

// Mock the icons to prevent font-loading warnings
jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("BookingModal Component", () => {
  const mockOffering = {
    id: "1",
    title: "Advanced System Design",
    duration: "60 min",
    level: "Senior",
    icon: "server-outline",
    description: "A deep dive into scalable architecture.",
  };

  // Correctly formatted backend availability slot
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0]; // e.g., "2026-05-10"

  const mockAvailability = [
    {
      day: weekday,
      times: [
        {
          id: "slot-1",
          label: "10:00 - 11:00",
          isBooked: false,
          date: dateStr,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the offering details correctly when visible", () => {
    const { getByText } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
      />,
    );

    expect(getByText("Advanced System Design")).toBeTruthy();
    expect(getByText("60 min • Senior")).toBeTruthy();
  });

  it("shows inline validation if user tries to submit without selecting a time", () => {
    const mockOnSubmit = jest.fn();
    const { getByText } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
        onSubmit={mockOnSubmit}
      />,
    );

    fireEvent.press(getByText("Continue"));

    expect(getByText("Please select a date for the session.")).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("updates cover letter text and enforces maximum length", async () => {
    const { getByPlaceholderText, getByText } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
      />,
    );

    const availableDateLabel = new Date(today);
    availableDateLabel.setDate(today.getDate() + 7);
    const dateLabel = availableDateLabel.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    fireEvent.press(getByText(dateLabel));
    fireEvent.press(getByText("10:00 - 11:00"));
    fireEvent.press(getByText("Continue"));

    const input = await waitFor(() =>
      getByPlaceholderText(/Introduce yourself/i),
    );

    fireEvent.changeText(input, "Hello, I'd like to learn system design.");

    expect(getByText(/39\/300/)).toBeTruthy();
  });
});
