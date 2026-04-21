import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { BookingModal } from "@/components/profile/BookingModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.spyOn(Alert, "alert");

// Fixed to a Monday so "next Monday" (7 days later) is predictable
const FIXED_DATE = new Date(2026, 3, 13, 8, 0, 0); // Mon Apr 13 2026
const NEXT_MONDAY_RAW = "2026-04-20";

describe("BookingModal Component", () => {
  const mockOffering = {
    id: "1",
    title: "Advanced System Design",
    duration: "60 min",
    level: "Senior",
    icon: "server-outline",
    description: "A deep dive into scalable architecture.",
  };

  const mockAvailability = [
    {
      day: "Monday",
      times: [
        {
          id: "slot-1",
          label: "10:00 - 11:00",
          isBooked: false,
          date: NEXT_MONDAY_RAW,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows primary action button when visible", () => {
    const { getByTestId } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
      />,
    );

    expect(getByTestId("primary-action-button")).toBeTruthy();
  });

  it("shows validation alert when submitting without selecting a time", () => {
    const mockOnSubmit = jest.fn();
    const { getByTestId } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
        onSubmit={mockOnSubmit}
      />,
    );

    fireEvent.press(getByTestId("primary-action-button"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Missing Information",
      expect.any(String),
    );
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("renders date option and time slot buttons from availability", () => {
    const { getByTestId } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
      />,
    );

    expect(getByTestId(`date-option-${NEXT_MONDAY_RAW}`)).toBeTruthy();

    fireEvent.press(getByTestId(`date-option-${NEXT_MONDAY_RAW}`));
    expect(getByTestId("time-slot-10:00 - 11:00")).toBeTruthy();
  });

  it("advances to cover letter step after selecting date and time", async () => {
    const { getByTestId } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
        isFirstTime={true}
      />,
    );

    fireEvent.press(getByTestId(`date-option-${NEXT_MONDAY_RAW}`));
    fireEvent.press(getByTestId("time-slot-10:00 - 11:00"));
    fireEvent.press(getByTestId("primary-action-button"));

    await waitFor(() => {
      expect(getByTestId("cover-letter-input")).toBeTruthy();
    });
  });

  it("accepts cover letter text input on step 2", async () => {
    const { getByTestId } = render(
      <BookingModal
        visible={true}
        onClose={jest.fn()}
        offering={mockOffering as any}
        availability={mockAvailability as any}
        isFirstTime={true}
      />,
    );

    fireEvent.press(getByTestId(`date-option-${NEXT_MONDAY_RAW}`));
    fireEvent.press(getByTestId("time-slot-10:00 - 11:00"));
    fireEvent.press(getByTestId("primary-action-button"));

    const input = await waitFor(() => getByTestId("cover-letter-input"));
    fireEvent.changeText(input, "Hello, I'd like to learn system design.");

    // Input should have been updated
    expect(input.props.value).toBe("Hello, I'd like to learn system design.");
  });
});